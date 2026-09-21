import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { getMe, login as loginApi, type AuthUser } from '../api/auth'
import {
  getToken,
  getUser,
  logoutStoredAuth,
  setToken,
  setUser as setStoredUser,
} from '../api/client'
import { AuthContext } from './auth'

// Auth session state, mirroring api.js: token + user live in localStorage
// (`famipetToken`/`famipetUser`), login persists both, logout clears them along
// with `annProfile` and sessionStorage (theme survives). On mount a stored
// token is re-validated with GET /auth/me; only a 401 clears the session, so an
// offline reload keeps the cached session (parity with the Vanilla app).

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string>(() => getToken())
  const [user, setUserState] = useState<AuthUser | null>(() => getUser() as AuthUser | null)
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
        if (data.user) {
          setUserState(data.user as AuthUser)
          setStoredUser(data.user as AuthUser)
        }
      })
      .catch((err: { status?: number }) => {
        if (cancelled) return
        if (err.status === 401) {
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