/**
 * Android app distribution.
 *
 * The APK lives in the public `app-downloads` Supabase Storage bucket. Each
 * release, the new APK is uploaded as `refundly.apk` (overwriting the old one),
 * so this public URL is stable and always points at the latest build.
 *
 * Override with `VITE_ANDROID_APK_URL` if you ever host it elsewhere.
 */
const DEFAULT_APK_URL =
  'https://csrilognqcsdkmstuqva.supabase.co/storage/v1/object/public/app-downloads/refundly.apk'

export const ANDROID_APK_URL: string =
  import.meta.env.VITE_ANDROID_APK_URL || DEFAULT_APK_URL

/** Optional version label shown next to the download, e.g. "1.0.0". */
export const ANDROID_APP_VERSION: string =
  import.meta.env.VITE_ANDROID_APP_VERSION || ''
