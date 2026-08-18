import { Card } from '@/components/ui'

/** Shown when Supabase env vars are missing, instead of crashing on auth. */
export function ConfigNotice() {
  return (
    <div className="grid min-h-dvh place-items-center bg-bg p-6">
      <Card className="max-w-md">
        <div className="mb-3 flex items-center gap-3">
          <img src="/icon.svg" alt="" className="size-9 rounded-lg" />
          <h1 className="text-lg font-bold">Connect Supabase to continue</h1>
        </div>
        <p className="text-[15px] text-text-2">
          Add your Supabase credentials to <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm">.env.local</code>{' '}
          and restart the dev server:
        </p>
        <pre className="mt-3 overflow-x-auto rounded-md bg-surface-2 p-3 text-sm text-text-2">
          {`VITE_SUPABASE_URL=…\nVITE_SUPABASE_ANON_KEY=…`}
        </pre>
        <p className="mt-3 text-sm text-text-3">
          Find these in your Supabase dashboard under Project Settings → API. The anon key is safe
          for the browser; never use the service_role key here.
        </p>
      </Card>
    </div>
  )
}
