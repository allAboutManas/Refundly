import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'

export default function NotFoundPage() {
  const navigate = useNavigate()
  return (
    <div className="grid min-h-dvh place-items-center bg-bg px-6 text-center">
      <div>
        <p className="text-6xl font-extrabold text-primary">404</p>
        <h1 className="mt-3 text-xl font-bold">Page not found</h1>
        <p className="mt-1.5 text-[15px] text-text-2">
          That page doesn't exist or has moved.
        </p>
        <Button className="mt-6" onClick={() => navigate('/app')}>
          Go to dashboard
        </Button>
      </div>
    </div>
  )
}
