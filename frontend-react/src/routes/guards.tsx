// Route guards — STUBS for Phase 4 (routing migration).
// They pass children through unchanged so every route is reachable now.
// Authorization is enforced later: RequireAuth in Phase 7 (authentication),
// RequireAdmin when admin routes are protected (Phases 7 + 21).
// ponytail: pass-through stubs; the backend already rejects unauthorized calls,
// frontend guards only shape navigation, so no security exposure while stubbed.

import type { ReactNode } from 'react'

export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  return <>{children}</>
}

export function RedirectIfAuthed({ children }: { children: ReactNode }) {
  return <>{children}</>
}