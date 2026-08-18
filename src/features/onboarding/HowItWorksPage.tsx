import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHeader } from '@/components/PageHeader'
import { Button } from '@/components/ui'
import { useCompleteOnboarding } from '@/api/profile'
import { LIFECYCLE_STEPS } from './steps'

/** Shown during onboarding and re-accessible from Settings → Help. */
export default function HowItWorksPage({ inApp = false }: { inApp?: boolean }) {
  const navigate = useNavigate()
  const complete = useCompleteOnboarding()
  const [busy, setBusy] = useState(false)

  async function start() {
    setBusy(true)
    try {
      await complete()
    } catch {
      /* fail open */
    }
    navigate('/app', { replace: true })
  }

  const body = (
    <ol>
      {LIFECYCLE_STEPS.map((step, i) => {
        const last = i === LIFECYCLE_STEPS.length - 1
        return (
          <li
            key={step.title}
            className="flex animate-slide-up gap-4"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex flex-col items-center">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-2 text-xl ring-1 ring-border">
                {step.emoji}
              </span>
              {!last && <span className="my-1 w-0.5 grow rounded-full bg-border" />}
            </div>
            <div className={last ? '' : 'pb-6'}>
              <h3 className="text-[15px] font-bold text-text">{step.title}</h3>
              <p className="mt-0.5 text-sm text-text-2">{step.description}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )

  if (inApp) {
    return (
      <>
        <PageHeader title="How it works" description="The full lifecycle of an order." back />
        {body}
      </>
    )
  }

  return (
    <div className="mx-auto min-h-dvh max-w-lg px-6 py-10">
      <div className="mb-8">
        <div className="flex items-center gap-2.5">
          <img src="/icon.svg" alt="" className="size-8 rounded-lg" />
          <span className="text-lg font-extrabold tracking-tight">Refundly</span>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold tracking-tight">How it works</h1>
        <p className="mt-1.5 text-[15px] text-text-2">
          Add an order once — we guide you through the rest.
        </p>
      </div>
      {body}
      <div className="sticky bottom-4 mt-8">
        <Button size="lg" fullWidth loading={busy} onClick={start}>
          Get started
        </Button>
      </div>
    </div>
  )
}
