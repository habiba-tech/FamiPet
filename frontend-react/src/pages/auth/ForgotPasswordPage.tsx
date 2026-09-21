import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { forgotPassword } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { AuthLeftPanel } from '../../components/auth/AuthLeftPanel'
import { Divider } from '../../components/auth/Divider'
import { InputBox } from '../../components/auth/InputBox'
import { SubmitButton } from '../../components/auth/SubmitButton'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Parity with forgot-password.html + forgot-password.js: on success the
// button turns green and the field error slot shows a green confirmation
// message (the backend deliberately uses the same response whether or not the
// email exists).

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [emailError, setEmailError] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success'>('idle')

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    setEmailError('')

    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Please enter a valid email.')
      return
    }

    setStatus('loading')

    try {
      await forgotPassword(email.trim())
      setStatus('success')
      setEmailError('If the email is registered, a reset link has been sent. Please check your inbox.')
    } catch (err) {
      setStatus('idle')
      setEmailError((err as ApiError).message || 'Something went wrong. Please try again.')
    }
  }

  return (
    <main className="login-page">
      <div className="login-container">
        <AuthLeftPanel
          tagline="Better Care, Better Life"
          title="Reset Your Password"
          text="Enter your account email and we'll send you a secure link to set a new password."
        />

        <section className="login-right">
          <div className="login-card">
            <div className="card-header">
              <div className="paw-icon">
                <i className="fa-solid fa-paw" />
              </div>
              <h2>Forgot Password</h2>
              <p>We'll email you a reset link.</p>
            </div>

            <form id="forgotForm" onSubmit={submit}>
              <InputBox
                id="email"
                icon="fa-regular fa-envelope"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={setEmail}
                error={emailError}
                errorColor={status === 'success' ? '#38C976' : undefined}
                autoComplete="email"
              />

              <SubmitButton
                id="forgotBtn"
                icon="fa-solid fa-paper-plane"
                label="Send Reset Link"
                loading={status === 'loading'}
                loadingLabel="Sending..."
                success={status === 'success'}
                successLabel="Reset Link Sent"
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