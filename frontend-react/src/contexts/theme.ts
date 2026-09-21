import { createContext } from 'react'

export type Theme = 'light' | 'dark'

export interface ThemeContextValue {
  theme: Theme
  setDark: () => void
  setLight: () => void
  toggle: () => void
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)