import { Download, Smartphone } from 'lucide-react'
import { ANDROID_APK_URL, ANDROID_APP_VERSION } from '@/lib/appDownload'

/**
 * Promo section that lets web users download the native Android app (APK).
 * The download target is configured via VITE_ANDROID_APK_URL (see appDownload.ts).
 */
export function GetTheAppCard() {
  return (
    <section className="mb-5">
      <h2 className="mb-2 px-1 text-sm font-bold uppercase tracking-wide text-text-3">
        Get the app
      </h2>

      <div className="overflow-hidden rounded-lg border border-border bg-gradient-to-br from-primary to-primary-hover shadow-sm">
        <div className="flex items-center gap-4 p-5">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white/15 text-white">
            <Smartphone className="size-6" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-white">Refundly for Android</p>
            <p className="mt-0.5 text-sm text-white/80">
              Install the native app for reminders on the go
              {ANDROID_APP_VERSION ? ` · v${ANDROID_APP_VERSION}` : ''}.
            </p>
          </div>
        </div>

        <a
          href={ANDROID_APK_URL}
          download="Refundly.apk"
          className="flex items-center justify-center gap-2 border-t border-white/15 bg-white/10 px-5 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          <Download className="size-4" />
          Download for Android
        </a>
      </div>

      <p className="mt-2 px-1 text-xs text-text-3">
        Direct APK download. Your phone may ask you to allow installs from your browser.
      </p>
    </section>
  )
}
