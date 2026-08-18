import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useCompleteOnboarding } from '@/api/profile'
import { Button } from '@/components/ui'

export default function WelcomePage() {
  const navigate = useNavigate()
  const complete = useCompleteOnboarding()
  const [busy, setBusy] = useState(false)

  async function skip() {
    setBusy(true)
    try {
      await complete()
    } catch {
      /* fail open */
    }
    navigate('/app', { replace: true })
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6">
      <div className="w-full max-w-md text-center animate-slide-up">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl bg-primary text-3xl shadow-pop">
          <img src="/icon.svg" alt="" className="size-10" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight">Never forget a refund again.</h1>
        <p className="mx-auto mt-3 max-w-sm text-[15px] leading-relaxed text-text-2">
          Refundly keeps track of your orders, deadlines, refund forms and pending refunds —
          so you don't have to.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <Button size="lg" fullWidth rightIcon={<ArrowRight className="size-4" />} onClick={() => navigate('/app/how-it-works')}>
            See how it works
          </Button>
          <Button size="lg" fullWidth variant="ghost" onClick={skip} loading={busy}>
            Skip for now
          </Button>
        </div>
      </div>
    </div>
  )
}
