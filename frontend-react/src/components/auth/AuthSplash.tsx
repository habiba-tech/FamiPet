import { Icon } from '../shared/Icon'

// Shown while the stored session is validated on load (AuthProvider.loading),
// so a valid session never flashes "logged out" during the /auth/me check.

export function AuthSplash() {
  return (
    <div className="auth-splash" role="status" aria-label="Loading">
      <Icon name="spinner" spin />
    </div>
  )
}