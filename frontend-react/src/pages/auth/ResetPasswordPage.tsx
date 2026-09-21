import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { resetPassword } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { setToken } from '../../api/client'
import { AuthLeftPanel } from '../../components/auth/AuthLeftPanel'
import { Divider } from '../../components/auth/Divider'
import { InputBox } from '../../components/auth/InputBox'
import { SubmitButton } from '../../components/auth/SubmitButton'

// Parity with reset-password.html + reset-password.js: reads `token` from the
// URL, validates, calls /auth/reset-password/:token, and on success shows a
// green confirmation before redirecting to /login (2s). If the backend returns
// a fresh token it is stored, as in Vanilla.

export function ResetPasswordPage() {
  const { token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    setPasswordError('')
    setConfirmError('')

    let valid = true

    if (password.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      valid = false
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      valid = false
    }
    if (!token) {
      setPasswordError('This reset link is missing or invalid.')
      valid = false
    }
    if (!valid) return

    setStatus('loading')

    try {
      const data = await resetPassword(token as string, password)
      if (data.token) {
        setToken(data.token)
      }

      setStatus('success')
      setPasswordError('Password reset successful! Redirecting...')
      setTimeout(() => navigate('/login'), 2000)
    } catch (err) {
      setStatus('idle')
      const apiErr = err as ApiError
      setPasswordError(
        (apiErr.data && apiErr.data.message) || 'The reset link is invalid or has expired.',
      )
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <AuthLeftPanel
          tagline="Better Care, Better Life"
          title="Choose a New Password"
          text="Set a strong new password for your Famipet account."
        />

        <section className="login-right">
          <div className="login-card">
            <div className="card-header">
              <div className="paw-icon">
                <i className="fa-solid fa-paw" />
              </div>
              <h2>Reset Password</h2>
              <p>Enter your new password.</p>
            </div>

            <form id="resetForm" onSubmit={submit}>
              <InputBox
                id="password"
                icon="fa-solid fa-lock"
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={setPassword}
                error={passwordError}
                errorColor={status === 'success' ? '#38C976' : undefined}
                autoComplete="new-password"
                toggleClass="toggle-password"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              <InputBox
                id="confirmPassword"
                icon="fa-solid fa-lock"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirm}
                onChange={setConfirm}
                error={confirmError}
                autoComplete="new-password"
                toggleClass="toggle-confirm-password"
                showPassword={showConfirm}
                onTogglePassword={() => setShowConfirm(!showConfirm)}
              />

              <SubmitButton
                id="resetBtn"
                icon="fa-solid fa-key"
                label="Reset Password"
                loading={status === 'loading'}
                loadingLabel="Resetting..."
                success={status === 'success'}
                successLabel="Password Updated"
              />

              <Divider />

              <div className="signup-text">
                Remembered? <Link to="/login">Back to Login</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}