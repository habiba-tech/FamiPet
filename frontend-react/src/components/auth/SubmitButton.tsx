// Auth submit button — parity with the spinner/check + disabled states the
// Vanilla auth JS writes into `.submit-btn` (login.js, signup.js,
// forgot-password.js, reset-password.js). The green success gradient comes
// from the `.submit-btn.success` rule in login.css.

interface SubmitButtonProps {
  id?: string
  icon?: string
  label: string
  loading?: boolean
  loadingLabel?: string
  success?: boolean
  successLabel?: string
}

export function SubmitButton({
  id,
  icon,
  label,
  loading = false,
  loadingLabel,
  success = false,
  successLabel,
}: SubmitButtonProps) {
  const busy = loading || success
  const iconClass = loading
    ? 'fa-solid fa-spinner fa-spin'
    : success
      ? 'fa-solid fa-check'
      : `fa-solid ${icon}`

  return (
    <button type="submit" id={id} className={`submit-btn${success ? ' success' : ''}`} disabled={busy}>
      <i className={iconClass} />
      {loading ? loadingLabel : success ? successLabel : label}
    </button>
  )
}