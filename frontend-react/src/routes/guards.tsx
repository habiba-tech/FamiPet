// Route guards — replace the Phase 4 pass-through stubs with the real auth
// behavior. Parity with the Vanilla guards:
//   - pages with the sidebar redirect to login.html when not logged in
//   - the login redirect sends admins to ../admin/dashboard.html (= /app/admin)
//   - guard failures use <Navigate replace> (no redundant history entries).
// Avoids redirect loops: while AuthProvider.loading nothing redirects; auth
// pages bounce once to the app only after the session state settles.

import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { AuthSplash } from '../components/auth/AuthSplash'
import { useAuth } from '../hooks/useAuth'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />

  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location }} />
  if (!isAdmin) return <Navigate to="/app/dashboard" replace />

  return <>{children}</>
}

// Bounces authenticated users off the auth pages. Admins land on the admin
// dashboard (/app/admin), everyone else on /app/dashboard — mirroring the
// role-based post-login redirect in login.js.
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()

  if (loading) return <AuthSplash />
  if (isAuthenticated) return <Navigate to={isAdmin ? '/app/admin' : '/app/dashboard'} replace />

  return <>{children}</>
}