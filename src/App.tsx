import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ConfigNotice } from '@/components/ConfigNotice'
import { FullScreenLoader } from '@/components/FullScreenLoader'
import { RequireAuth, RequireGuest } from '@/routes/guards'
import { AppLayout } from '@/features/app/AppLayout'
import { OnboardingGate } from '@/features/app/OnboardingGate'

// Lazily loaded route chunks — keeps the initial bundle small.
const LoginPage = lazy(() => import('@/features/auth/LoginPage'))
const RegisterPage = lazy(() => import('@/features/auth/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'))
const WelcomePage = lazy(() => import('@/features/onboarding/WelcomePage'))
const HowItWorksPage = lazy(() => import('@/features/onboarding/HowItWorksPage'))
const DashboardPage = lazy(() => import('@/features/dashboard/DashboardPage'))
const OrdersPage = lazy(() => import('@/features/orders/OrdersPage'))
const AddOrderPage = lazy(() => import('@/features/orders/AddOrderPage'))
const OrderDetailPage = lazy(() => import('@/features/orders/OrderDetailPage'))
const TimelinePage = lazy(() => import('@/features/timeline/TimelinePage'))
const NotificationsPage = lazy(() => import('@/features/notifications/NotificationsPage'))
const AccountsPage = lazy(() => import('@/features/accounts/AccountsPage'))
const SettingsPage = lazy(() => import('@/features/settings/SettingsPage'))
const ProfileSettingsPage = lazy(() => import('@/features/settings/ProfileSettingsPage'))
const NotificationSettingsPage = lazy(() => import('@/features/settings/NotificationSettingsPage'))
const HolidaySettingsPage = lazy(() => import('@/features/settings/HolidaySettingsPage'))
const PrivacyPage = lazy(() => import('@/features/settings/PrivacyPage'))
const AboutPage = lazy(() => import('@/features/settings/AboutPage'))
const NotFoundPage = lazy(() => import('@/features/NotFoundPage'))

export default function App() {
  if (!isSupabaseConfigured) return <ConfigNotice />

  return (
    <BrowserRouter>
      <Suspense fallback={<FullScreenLoader />}>
        <Routes>
          {/* Public auth routes */}
          <Route element={<RequireGuest />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          </Route>

          {/* Password recovery: user enters the emailed 6-digit code here (public) */}
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Authenticated */}
          <Route element={<RequireAuth />}>
            {/* Onboarding lives outside the app shell (full-screen) */}
            <Route path="/app/welcome" element={<WelcomePage />} />
            <Route path="/app/how-it-works" element={<HowItWorksPage />} />

            {/* Main app shell, gated on completed onboarding */}
            <Route element={<OnboardingGate />}>
              <Route path="/app" element={<AppLayout />}>
                <Route index element={<DashboardPage />} />
                <Route path="orders" element={<OrdersPage />} />
                <Route path="orders/new" element={<AddOrderPage />} />
                <Route path="orders/:id" element={<OrderDetailPage />} />
                <Route path="timeline" element={<TimelinePage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="accounts" element={<AccountsPage />} />
                <Route path="settings" element={<SettingsPage />} />
                <Route path="settings/profile" element={<ProfileSettingsPage />} />
                <Route path="settings/notifications" element={<NotificationSettingsPage />} />
                <Route path="settings/holidays" element={<HolidaySettingsPage />} />
                <Route path="settings/privacy" element={<PrivacyPage />} />
                <Route path="settings/about" element={<AboutPage />} />
                <Route path="settings/how-it-works" element={<HowItWorksPage inApp />} />
              </Route>
            </Route>
          </Route>

          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}
