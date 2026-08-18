import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/lib/auth'
import { FullScreenLoader } from '@/components/FullScreenLoader'

/** Gate for authenticated-only routes. */
export function RequireAuth() {
  const { session, initializing } = useAuth()
  const location = useLocation()
  if (initializing) return <FullScreenLoader />
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

/** Gate for auth screens — redirects signed-in users into the app. */
export function RequireGuest() {
  const { session, initializing } = useAuth()
  if (initializing) return <FullScreenLoader />
  if (session) return <Navigate to="/app" replace />
  return <Outlet />
}
