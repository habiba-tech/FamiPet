// Password strength bar — parity with the score logic in signup.js (5 checks:
// length>=8, lowercase, uppercase, digit, symbol) and the width/color/text
// values for weak (33% #EF4444), medium (66% #F59E0B), strong (100% #22C55E).

export function StrengthBar({ password }: { password: string }) {
  let width = '0%'
  let color = '#E5E7EB'
  let label = ''

  if (password.length > 0) {
    let score = 0
    if (password.length >= 8) score++
    if (/[a-z]/.test(password)) score++
    if (/[A-Z]/.test(password)) score++
    if (/\d/.test(password)) score++
    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score++

    if (score <= 2) {
      width = '33%'
      color = '#EF4444'
      label = 'Weak Password'
    } else if (score <= 4) {
      width = '66%'
      color = '#F59E0B'
      label = 'Medium Password'
    } else {
      width = '100%'
      color = '#22C55E'
      label = 'Strong Password'
    }
  }

  return (
    <div className="strength-wrapper">
      <div className="strength-bar">
        <div className="strength-fill" id="strengthBar" style={{ width, background: color }} />
      </div>
      <span id="strengthText" style={label ? { color } : undefined}>
        {label}
      </span>
    </div>
  )
}