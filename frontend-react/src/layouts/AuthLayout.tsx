import { Outlet } from 'react-router-dom'

// Auth shell — the split two-column chrome (login.css) arrives with the auth
// pages in Phase 7; for now this passes each auth route straight through while
// keeping the authentication area separate from landing/app/admin.

export function AuthLayout() {
  return <Outlet />
}