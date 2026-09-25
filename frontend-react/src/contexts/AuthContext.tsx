import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMe, login as loginApi, type AuthUser } from '../api/auth'
import {
  getToken,
  getUser,
  logoutStoredAuth,
  normalizeUser,
  setToken,
  setUser as setStoredUser,
  type StoredUser,
} from '../api/client'
import { AuthContext } from './auth'

// Auth session state, mirroring api.js: token + user live in localStorage
// (`famipetToken`/`famipetUser`), login persists both, logout clears them along
// with `annProfile` and sessionStorage (theme survives). On mount a stored
// token is re-validated with GET /auth/me; a 401 clears the ENTIRE stored
// session exactly like api.js does on any 401-with-token, so a revoked/expired
// token can never leave a stale user behind for the next reload or user. An
// offline reload (network error, non-401) keeps the cached session (parity).

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(() => getToken())
  const [user, setUserState] = useState<AuthUser | null>(() =>
    getToken() ? (getUser() as AuthUser | null) : null,
  )
  const [loading, setLoading] = useState<boolean>(() => !!getToken())

  useEffect(() => {
    let cancelled = false
    if (!getToken()) {
      setLoading(false)
      return () => {
        cancelled = true
      }
    }

    getMe()
      .then((data) => {
        if (cancelled) return
        // GET /auth/me returns the raw mongoose doc (`_id`), not `publicUser`
        // (`id`); normalize so the stored user keeps an `id` consumers rely on.
        const me = normalizeUser(data.user as StoredUser | null)
        if (me) {
          setUserState(me as AuthUser)
          setStoredUser(me)
        }
      })
      .catch((err: { status?: number }) => {
        if (cancelled) return
        if (err.status === 401) {
          // Expired/revoked token: mirror the api.js 401-with-token rule —
          // logoutStoredAuth() also clears annProfile + sessionStorage.
          logoutStoredAuth()
          setUserState(null)
          setTokenState('')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginApi(email, password)
    setToken(data.token)
    setTokenState(data.token)
    setUserState(data.user)
    setStoredUser(data.user)
    return data
  }, [])

  const logout = useCallback(() => {
    logoutStoredAuth()
    setUserState(null)
    setTokenState('')
  }, [])

  const setUser = useCallback((next: AuthUser | null) => {
    setUserState(next)
    setStoredUser(next)
  }, [])

  const value = useMemo(
    () => ({
      user,
      token,
      isAuthenticated: !!token,
      isAdmin: !!(user && user.role === 'admin'),
      loading,
      login,
      logout,
      setUser,
    }),
    [user, token, loading, login, logout, setUser],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}