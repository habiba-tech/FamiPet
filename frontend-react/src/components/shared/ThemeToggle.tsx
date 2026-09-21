import { useTheme } from '../../hooks/useTheme'
import { Icon } from './Icon'

// Parity with frontend/js/theme.js icon contract: light shows `fa-regular fa-sun`
// with "Switch to dark mode", dark shows `fa-regular fa-moon` with
// "Switch to light mode". Button styling comes from the ported navbar.css
// (`.theme-btn`).

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const isDark = theme === 'dark'
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      type="button"
      className="theme-btn"
      aria-label={label}
      title={label}
      onClick={toggle}
    >
      <Icon name={isDark ? 'moon' : 'sun'} />
    </button>
  )
}