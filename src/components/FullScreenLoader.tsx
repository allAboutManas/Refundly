import { Spinner } from '@/components/ui'

export function FullScreenLoader({ label }: { label?: string }) {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg">
      <div className="flex flex-col items-center gap-3 text-text-3">
        <img src="/icon.svg" alt="" className="size-11 animate-pulse rounded-xl" />
        <Spinner className="size-5 text-primary" />
        {label && <p className="text-sm">{label}</p>}
      </div>
    </div>
  )
}
