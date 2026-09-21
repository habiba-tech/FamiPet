// Role radio card (signup). The checked gradient + white text are pure CSS via
// `.role-card:has(input:checked)` (signup.css), so no JS toggle is needed —
// exactly the cards from signup.html (Vet stays commented out as in Vanilla).

import { Icon } from '../shared/Icon'

interface RoleCardProps {
  name: string
  value: string
  checked: boolean
  icon: string
  title: string
  subtitle: string
  onChange: (value: string) => void
}

export function RoleCard({ name, value, checked, icon, title, subtitle, onChange }: RoleCardProps) {
  return (
    <label className="role-card">
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      <Icon name={icon} />
      <h4>{title}</h4>
      <small>{subtitle}</small>
    </label>
  )
}