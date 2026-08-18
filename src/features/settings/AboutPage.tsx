import { PageHeader } from '@/components/PageHeader'
import { Card } from '@/components/ui'

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="About" back />
      <Card className="text-center">
        <img src="/icon.svg" alt="" className="mx-auto size-14 rounded-2xl" />
        <h2 className="mt-4 text-lg font-extrabold">Refundly</h2>
        <p className="mt-1 text-sm text-text-3">Version 0.1.0</p>
        <p className="mx-auto mt-4 max-w-xs text-[15px] text-text-2">
          Add it once. Get reminded at the right time. Never forget your refund.
        </p>
      </Card>
    </div>
  )
}
