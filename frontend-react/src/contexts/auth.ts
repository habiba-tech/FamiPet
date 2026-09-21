import { createContext } from 'react'
import type { AuthUser, LoginResponse } from '../api/auth'

export interface AuthContextValue {
  user: AuthUser | null
  token: string
  isAuthenticated: boolean
  isAdmin: boolean
  /** True while a stored session is validated against `/auth/me` on load. */
  loading: boolean
  login: (email: string, password: string) => Promise<LoginResponse>
  logout: () => void
  setUser: (user: AuthUser | null) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)