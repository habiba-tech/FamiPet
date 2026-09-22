// Shared veterinarian select (Phase 13) — consumed by the Appointments booking
// modal now and by the (deferred) PetGPT find-a-vet flow later. Data comes from
// the public GET /veterinarians list — same payload shape incl. clinic suffix
// the Vanilla appointments booking modal rendered.

import type { Veterinarian } from '../../api/veterinarians'

interface Props {
  vets: Veterinarian[]
  value: string
  onChange: (id: string) => void
  inputId?: string
  label?: string
}

export function VetSelect({ vets, value, onChange, inputId = 'vetSelect', label = 'Veterinary Clinic' }: Props) {
  return (
    <div className="form-group">
      <label htmlFor={inputId}>{label}</label>
      <select id={inputId} value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Select a veterinarian</option>
        {vets.map((v) => (
          <option key={v._id} value={v._id}>
            {v.name}
            {v.clinic ? ` - ${v.clinic}` : ''}
          </option>
        ))}
      </select>
    </div>
  )
}