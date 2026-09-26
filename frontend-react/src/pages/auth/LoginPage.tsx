import { Icon } from '../../components/shared/Icon'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { resendVerification } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { getErrorMessage } from '../../lib/errors'
import { AuthLeftPanel } from '../../components/auth/AuthLeftPanel'
import { Divider } from '../../components/auth/Divider'
import { InputBox } from '../../components/auth/InputBox'
import { SubmitButton } from '../../components/auth/SubmitButton'
import { useAuth } from '../../hooks/useAuth'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Parity with login.html + login.js, including the role-based post-login
// redirect (admin → /app/admin, everyone else → /app/dashboard) and the
// inline "Resend verification email" link that appears when the backend
// reports isVerified:false. The redirect itself is handled by
// RedirectIfAuthed (auth layout wrapper) as soon as the auth context flips —
// it honors the deep-link `from` target too, so login does not navigate on its
// own (avoids a dashboard-flash race after a deep-link login).

export function LoginPage() {
  const { login } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailError, setEmailError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')
  const [resend, setResend] = useState({ visible: false, busy: false, text: '' })

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    setEmailError('')
    setPasswordError('')
    setResend({ visible: false, busy: false, text: '' })

    let valid = true
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Please enter a valid email.')
      valid = false
    }
    if (password.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      valid = false
    }
    if (!valid) return

    setStatus('loading')

    try {
      await login(email.trim(), password)
      setStatus('success')
    } catch (err) {
      setStatus('idle')

      const apiErr = err as ApiError
      const msg = getErrorMessage(err, 'Login failed. Please try again.')

      if (apiErr.data && apiErr.data.isVerified === false) {
        setPasswordError('Please verify your email before logging in.')
        setResend({ visible: true, busy: false, text: '' })
        return
      }

      if (apiErr.status === 403 && msg.toLowerCase().includes('blocked')) {
        setEmailError(msg)
        return
      }

      setPasswordError(msg)
    }
  }

  const sendResend = async () => {
    if (resend.busy) return
    setResend({ visible: true, busy: true, text: 'Sending...' })
    try {
      await resendVerification(email.trim())
      setResend({ visible: true, busy: false, text: 'Verification email sent! Check your inbox.' })
    } catch (err) {
      setResend({ visible: true, busy: false, text: getErrorMessage(err, 'Could not send verification email.') })
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <AuthLeftPanel
          tagline="Better Care, Better Life"
          title="Welcome Back!"
          text="Continue your journey towards smarter pet care, effortless adoption, and healthier companions."
        />

        <section className="login-right">
          <div className="login-card">
            <div className="card-header">
              <div className="paw-icon">
                <Icon name="paw" />
              </div>
              <h2>Login</h2>
              <p>Sign in to continue caring for your furry friends.</p>
            </div>

            <form id="loginForm" onSubmit={submit}>
              <InputBox
                id="email"
                icon="envelope"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={setEmail}
                error={emailError}
                autoComplete="email"
              />

              <InputBox
                id="password"
                icon="lock"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                error={passwordError}
                autoComplete="current-password"
                toggleClass="toggle-password"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              <div className="form-options">
                <label>
                  <input type="checkbox" /> Remember Me
                </label>
                <Link to="/forgot-password">Forgot Password?</Link>
              </div>

              {resend.visible && (
                <a
                  href="#"
                  id="resendVerifyLink"
                  style={{ display: 'block', textAlign: 'right', fontSize: '12px', marginTop: '4px' }}
                  onClick={(ev) => {
                    ev.preventDefault()
                    void sendResend()
                  }}
                >
                  {resend.text || 'Resend verification email'}
                </a>
              )}

              <SubmitButton
                id="loginBtn"
                icon="right-to-bracket"
                label="Login"
                loading={status === 'loading'}
                loadingLabel="Logging In..."
                success={status === 'success'}
                successLabel="Login Successful"
              />

              <Divider />

              <div className="signup-text">
                Don't have an account? <Link to="/signup">Sign Up</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </main>
  )
}