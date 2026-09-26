import { Icon } from '../../components/shared/Icon'
import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register } from '../../api/auth'
import type { ApiError } from '../../api/client'
import { getErrorMessage } from '../../lib/errors'
import { AuthLeftPanel } from '../../components/auth/AuthLeftPanel'
import { Divider } from '../../components/auth/Divider'
import { InputBox } from '../../components/auth/InputBox'
import { RoleCard } from '../../components/auth/RoleCard'
import { StrengthBar } from '../../components/auth/StrengthBar'
import { SubmitButton } from '../../components/auth/SubmitButton'
import { SuccessToast } from '../../components/auth/SuccessToast'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Parity with signup.html + signup.js: role cards (owner/shelter — the Vet
// card stays commented out as in Vanilla), live password strength + confirm
// mismatch, and the success toast before redirecting to /login. The role
// selection is UI-only in Vanilla (register sends no role field) — preserved.

export function SignupPage() {
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [role, setRole] = useState('owner')
  const [terms, setTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [nameError, setNameError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [phoneError, setPhoneError] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [termsError, setTermsError] = useState('')

  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [toast, setToast] = useState(false)

  // Live confirm check (Vanilla runs this on keyup: only a non-empty mismatch
  // is shown, the blocking check happens again at submit).
  const onConfirmChange = (value: string) => {
    setConfirm(value)
    if (value === '') {
      setConfirmError('')
    } else if (password !== value) {
      setConfirmError('Passwords do not match')
    } else {
      setConfirmError('')
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()

    setNameError('')
    setEmailError('')
    setPhoneError('')
    setPasswordError('')
    setConfirmError('')
    setTermsError('')

    let valid = true

    if (name.trim().length < 2) {
      setNameError('Please enter your full name.')
      valid = false
    }
    if (!EMAIL_PATTERN.test(email.trim())) {
      setEmailError('Please enter a valid email.')
      valid = false
    }
    if (phone.trim().length < 6) {
      setPhoneError('Please enter a valid phone number.')
      valid = false
    }
    if (password.trim().length < 6) {
      setPasswordError('Password must be at least 6 characters.')
      valid = false
    }
    if (password !== confirm) {
      setConfirmError('Passwords do not match.')
      valid = false
    }
    if (!terms) {
      setTermsError('Please accept the Terms & Privacy Policy.')
      valid = false
    }
    if (!valid) return

    setStatus('loading')

    try {
      await register({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
      })

      setToast(true)
      setTimeout(() => navigate('/login'), 3000)
    } catch (err) {
      setStatus('idle')

      const apiErr = err as ApiError
      if (apiErr.data && apiErr.data.message) {
        if (apiErr.data.message.toLowerCase().includes('email')) {
          setEmailError(apiErr.data.message)
        } else {
          setPasswordError(apiErr.data.message)
        }
      } else {
        setPasswordError(getErrorMessage(apiErr, 'Registration failed. Please try again.'))
      }
    }
  }

  return (
    <main className="login-page signup-page">
      <div className="login-container">
        <AuthLeftPanel
          tagline="Start Your Journey Today"
          title="Join the Famipet Family!"
          text="Create your account to manage your pets, track vaccinations, adopt loving companions, report lost & found pets, and enjoy smarter pet care—all in one place."
        />

        <section className="login-right">
          <div className="login-card">
            <div className="card-header">
              <div className="paw-icon">
                <Icon name="paw" />
              </div>
              <h2>Create Account</h2>
              <p>Let's get your pet journey started!</p>
            </div>

            <form id="signupForm" onSubmit={submit} autoComplete="off">
              <InputBox
                id="fullName"
                icon="user"
                type="text"
                placeholder="Full Name"
                value={name}
                onChange={setName}
                error={nameError}
              />

              <InputBox
                id="email"
                icon="envelope"
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={setEmail}
                error={emailError}
              />

              <InputBox
                id="phone"
                icon="phone"
                type="tel"
                placeholder="Phone Number"
                value={phone}
                onChange={setPhone}
                error={phoneError}
              />

              <InputBox
                id="password"
                icon="lock"
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={setPassword}
                error={passwordError}
                toggleClass="toggle-password"
                showPassword={showPassword}
                onTogglePassword={() => setShowPassword(!showPassword)}
              />

              <InputBox
                id="confirmPassword"
                icon="lock"
                type={showConfirm ? 'text' : 'password'}
                placeholder="Confirm Password"
                value={confirm}
                onChange={onConfirmChange}
                error={confirmError}
                toggleClass="toggle-confirm-password"
                showPassword={showConfirm}
                onTogglePassword={() => setShowConfirm(!showConfirm)}
              />

              <StrengthBar password={password} />

              <div className="role-title">I am a...</div>

              <div className="role-selection">
                <RoleCard
                  name="role"
                  value="owner"
                  checked={role === 'owner'}
                  icon="paw"
                  title="Pet Owner"
                  subtitle="Manage your pets"
                  onChange={setRole}
                />

                <RoleCard
                  name="role"
                  value="shelter"
                  checked={role === 'shelter'}
                  icon="house"
                  title="Shelter"
                  subtitle="Help pets find homes"
                  onChange={setRole}
                />
              </div>

              <div className="form-options">
                <label>
                  <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} />
                  I agree to the Terms &amp; Privacy Policy
                </label>
              </div>

              <small className="error">{termsError}</small>

              <SubmitButton
                id="signupBtn"
                icon="user-plus"
                label="Create Account"
                loading={status === 'loading'}
                loadingLabel="Creating..."
              />
            </form>

            <Divider />

            <div className="signup-text">
              Already have an account? <Link to="/login">Login</Link>
            </div>
          </div>
        </section>
      </div>

      <SuccessToast
        show={toast}
        title="Account Created!"
        message="Please check your email to verify your account."
      />
    </main>
  )
}