import { Navigate, Outlet } from 'react-router-dom'
import { useProfile } from '@/api/profile'
import { FullScreenLoader } from '@/components/FullScreenLoader'

/**
 * Redirects first-time users to the Welcome screen until onboarding is done.
 * Fails open: if the profile can't be loaded, the user is let into the app.
 */
export function OnboardingGate() {
  const { data: profile, isLoading, isError } = useProfile()
  if (isLoading) return <FullScreenLoader />
  if (!isError && profile && !profile.onboarding_completed) {
    return <Navigate to="/app/welcome" replace />
  }
  return <Outlet />
}
