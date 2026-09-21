// Shown while the stored session is validated on load (AuthProvider.loading),
// so a valid session never flashes "logged out" during the /auth/me check.

export function AuthSplash() {
  return (
    <div className="auth-splash" role="status" aria-label="Loading">
      <i className="fa-solid fa-spinner fa-spin" />
    </div>
  )
}