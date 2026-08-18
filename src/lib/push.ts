import { supabase } from './supabase'

const VAPID_PUBLIC = import.meta.env.VITE_VAPID_PUBLIC_KEY

/** Browser supports the APIs needed for web push. */
export function pushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  )
}

/** A VAPID public key is configured for this build. */
export function pushConfigured(): boolean {
  return Boolean(VAPID_PUBLIC)
}

function urlBase64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const buffer = new ArrayBuffer(raw.length)
  const out = new Uint8Array(buffer)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export async function getPushSubscription(): Promise<PushSubscription | null> {
  if (!pushSupported()) return null
  const reg = await navigator.serviceWorker.ready
  return reg.pushManager.getSubscription()
}

export async function isPushEnabled(): Promise<boolean> {
  return Boolean(await getPushSubscription())
}

/** Subscribe this device and persist the subscription in device_tokens. */
export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!pushSupported() || !VAPID_PUBLIC) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  const reg = await navigator.serviceWorker.ready
  const existing = await reg.pushManager.getSubscription()
  const sub =
    existing ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
    }))

  const token = JSON.stringify(sub)
  const { error } = await supabase.from('device_tokens').upsert(
    {
      user_id: userId,
      token,
      device_type: 'web',
      is_active: true,
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id,token' },
  )
  return !error
}

/** Unsubscribe this device and deactivate its token. */
export async function unsubscribeFromPush(): Promise<void> {
  const sub = await getPushSubscription()
  if (!sub) return
  const token = JSON.stringify(sub)
  await sub.unsubscribe().catch(() => undefined)
  await supabase.from('device_tokens').update({ is_active: false }).eq('token', token)
}
