import type { ReactNode } from 'react'
import { Check, Smartphone } from 'lucide-react'
import { cn } from '@/lib/cn'
import { ANDROID_APK_URL } from '@/lib/appDownload'

const TIMELINE = [
  { label: 'Order added', done: true },
  { label: 'Delivered', done: true },
  { label: 'Review reminder', done: true },
  { label: 'Refund due', done: false },
  { label: '₹1,499 received', done: false, money: true },
]

function BrandTimeline() {
  return (
    <div className="relative w-full max-w-xs">
      <div className="rounded-2xl border border-white/15 bg-white/10 p-5 shadow-pop backdrop-blur-md">
        <p className="mb-4 text-sm font-semibold text-white/70">Noise Headphones · Amazon</p>
        <ol className="relative space-y-4">
          {TIMELINE.map((step, i) => (
            <li
              key={step.label}
              className="flex items-center gap-3 animate-slide-up"
              style={{ animationDelay: `${i * 120 + 150}ms` }}
            >
              <span
                className={cn(
                  'grid size-6 shrink-0 place-items-center rounded-full text-white',
                  step.done ? 'bg-white/90 text-primary' : 'border-2 border-white/40',
                )}
              >
                {step.done && <Check className="size-3.5" strokeWidth={3} />}
              </span>
              <span
                className={cn(
                  'text-[15px]',
                  step.money ? 'font-bold text-white' : step.done ? 'text-white/90' : 'text-white/60',
                )}
              >
                {step.label}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  )
}

export function AuthLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <div className="min-h-dvh lg:grid lg:grid-cols-2">
      {/* Form side */}
      <div className="flex min-h-dvh flex-col justify-center px-6 py-10 lg:min-h-0">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5">
            <img src="/icon.svg" alt="" className="size-9 rounded-lg" />
            <span className="text-lg font-extrabold tracking-tight">Refundly</span>
          </div>
          {children}

          <a
            href={ANDROID_APK_URL}
            download="Refundly.apk"
            className="mt-8 flex items-center justify-center gap-2 text-sm font-medium text-text-3 transition-colors hover:text-text"
          >
            <Smartphone className="size-4" />
            Get the Android app
          </a>
        </div>
      </div>

      {/* Brand side (desktop only) */}
      <div className="relative hidden overflow-hidden bg-primary lg:flex lg:flex-col lg:justify-center lg:px-14">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-72 rounded-full bg-white/10 blur-2xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-24 -left-10 size-80 rounded-full bg-black/10 blur-3xl"
        />
        <div className="relative z-10 max-w-md">
          <h2 className="text-3xl font-extrabold leading-tight text-white">
            Never forget a refund again.
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-white/80">
            Track your orders. Get reminded at the right time. Get your money back.
          </p>
          <div className="mt-9">
            <BrandTimeline />
          </div>
        </div>
      </div>
    </div>
  )
}
