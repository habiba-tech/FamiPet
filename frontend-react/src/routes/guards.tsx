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

// Bounces authenticated users off the auth pages. Destination mirrors login.js
// (admin → /app/admin, everyone else → /app/dashboard), but first honors the
// `state.from` set by RequireAuth/RequireAdmin so a deep-link login returns to
// the page the user originally tried to visit instead of flashing the
// dashboard. Navigating here (on the auth state flip during login) makes the
// post-login redirect deterministic — the login page no longer races its own
// delayed navigate.
export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) return <AuthSplash />
  if (isAuthenticated) {
    const stateFrom = (location.state as { from?: { pathname?: string } } | null)?.from?.pathname
    const from = stateFrom && stateFrom !== '/login' ? stateFrom : null
    const dest = from || (isAdmin ? '/app/admin' : '/app/dashboard')
    return <Navigate to={dest} replace />
  }

  return <>{children}</>
}