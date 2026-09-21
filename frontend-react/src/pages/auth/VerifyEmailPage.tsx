import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { verifyEmail } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { Divider } from '../../components/auth/Divider'

// Parity with verify-email.html + verify-email.js: verifies the token from the
// URL against GET /auth/verify-email/:token and renders the loading / success /
// error state inside the status card (this page has no left hero panel, exactly
// like the Vanilla page).

type Status = 'loading' | 'success' | 'error'

export function VerifyEmailPage() {
  const { token } = useParams()

  const [status, setStatus] = useState<Status>('loading')
  const [title, setTitle] = useState('Verifying...')
  const [message, setMessage] = useState('Please wait while we verify your email address.')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setTitle('Invalid Link')
      setMessage('This verification link is missing or invalid. Please request a new verification email.')
      return
    }

    verifyEmail(token)
      .then((data) => {
        setStatus('success')
        setTitle('Email Verified!')
        setMessage(data.message || 'Your email has been verified successfully. You can now login.')
      })
      .catch((err: ApiError) => {
        let msg = (err.data && err.data.message) || 'The verification link is invalid or has expired.'
        if (/expired|valid/i.test(msg)) {
          msg = 'The verification link is invalid or has expired. Please request a new verification email.'
        }
        setStatus('error')
        setTitle('Verification Failed')
        setMessage(msg)
      })
  }, [token])

  const icon =
    status === 'loading'
      ? 'fa-solid fa-spinner fa-spin'
      : status === 'success'
        ? 'fa-solid fa-circle-check'
        : 'fa-solid fa-circle-xmark'

  const actionText = status === 'success' ? 'Go to Login' : 'Back to Login'

  return (
    <main className="login-page">
      <div className="login-container">
        <section className="login-right">
          <div className="login-card verify-card">
            <div className="card-header">
              <div className="paw-icon">
                <i className="fa-solid fa-paw" />
              </div>
              <h2>Email Verification</h2>
              <p>Confirm your Famipet account.</p>
            </div>

            <div className="verify-status">
              <div className={`status-icon ${status}`}>
                <i className={icon} />
              </div>

              <h2>{title}</h2>
              <p>{message}</p>

              {status !== 'loading' && (
                <Link to="/login" className="submit-btn" style={{ display: 'inline-block', textDecoration: 'none' }}>
                  <i className="fa-solid fa-right-to-bracket" />
                  {actionText}
                </Link>
              )}
            </div>

            <Divider />

            <div className="signup-text">
              Already verified? <Link to="/login">Login</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}