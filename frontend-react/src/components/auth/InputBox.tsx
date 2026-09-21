// Auth form field — parity with the `.input-box` markup from the Vanilla auth
// pages (icon + input + optional eye toggle + `.error` slot). The error text
// lives in a `small.error` element (port of signup.css's error style so it is
// styled on every auth page, fixing the dead style in the Vanilla pages).

import type { CSSProperties } from 'react'

interface InputBoxProps {
  id: string
  icon: string
  type?: string
  placeholder: string
  value: string
  onChange: (value: string) => void
  error?: string
  errorColor?: string
  autoComplete?: string
  toggleClass?: 'toggle-password' | 'toggle-confirm-password'
  showPassword?: boolean
  onTogglePassword?: () => void
}

export function InputBox({
  id,
  icon,
  type = 'text',
  placeholder,
  value,
  onChange,
  error,
  errorColor,
  autoComplete,
  toggleClass,
  showPassword = false,
  onTogglePassword,
}: InputBoxProps) {
  const errorStyle: CSSProperties | undefined = errorColor ? { color: errorColor } : undefined

  return (
    <div className="input-box">
      <i className={icon} />

      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={value}
        autoComplete={autoComplete}
        onChange={(e) => onChange(e.target.value)}
      />

      {toggleClass && onTogglePassword && (
        <span className={toggleClass} onClick={onTogglePassword}>
          <i className={showPassword ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye'} />
        </span>
      )}

      <small className="error" style={errorStyle}>
        {error}
      </small>
    </div>
  )
}