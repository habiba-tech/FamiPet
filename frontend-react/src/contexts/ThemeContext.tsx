import { useEffect, useState, type ReactNode } from 'react'
import { FAMIPET_THEME_KEY } from '../lib/storage'
import { ThemeContext, type Theme } from './theme'

// Parity with frontend/js/theme.js: toggles `body.dark-theme`, persists
// localStorage `famipetTheme` ('dark' | 'light', default light), and drops the
// legacy `dark-mode` class. Dark styling is page-scoped in the Vanilla app
// (dashboard/mypet), so no global dark CSS is added here.

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(() =>
    localStorage.getItem(FAMIPET_THEME_KEY) === 'dark' ? 'dark' : 'light',
  )

  useEffect(() => {
    document.body.classList.toggle('dark-theme', theme === 'dark')
    document.body.classList.remove('dark-mode')
    localStorage.setItem(FAMIPET_THEME_KEY, theme)
  }, [theme])

  const value = {
    theme,
    setDark: () => setTheme('dark'),
    setLight: () => setTheme('light'),
    toggle: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}