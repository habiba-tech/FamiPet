// Phase 12 Appointments — "Book New Appointment" modal. React port of the
// booking modal in frontend/js/appointments.js (openBookingModal +
// saveNewAppointment), following the Phase 9/10/11 modal conventions:
// Escape/backdrop close, inline validation error instead of alert(), disabled
// submit while saving. Validation order mirrors Vanilla (date+time, then pet,
// then veterinarian); the success toast is shown by the page after save.

import { useEffect, useState, type FormEvent } from 'react'
import { createAppointment } from '../../../api/appointments'
import type { Veterinarian } from '../../../api/veterinarians'
import { Icon } from '../../../components/shared/Icon'
import type { PetView } from '../mypet/petBase'
import { BOOKING_TYPES, mapTypeToBackend } from './appointmentsBase'

interface Props {
  pets: PetView[]
  vets: Veterinarian[]
  onClose: () => void
  onSaved: () => Promise<void> | void
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function AppointmentFormModal({ pets, vets, onClose, onSaved }: Props) {
  const [pet, setPet] = useState('')
  const [type, setType] = useState(BOOKING_TYPES[0])
  const [date, setDate] = useState(todayISO())
  const [time, setTime] = useState('')
  const [vet, setVet] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!date || !time) {
      setError('Please select a date and time.')
      return
    }
    if (!pet) {
      setError('Please select a pet.')
      return
    }
    if (!vet) {
      setError('Please select a veterinarian.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await createAppointment({
        pet,
        veterinarian: vet,
        type: mapTypeToBackend(type),
        date,
        time,
        symptoms: '',
        notes: '',
      })
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to book appointment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="appointment-modal open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-label="Book New Appointment">
        <div className="modal-header">
          <h2>Book New Appointment</h2>
          <button className="close-modal" type="button" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="modalPet">Select Pet</label>
            <select id="modalPet" value={pet} onChange={(e) => setPet(e.target.value)}>
              <option value="">Select a pet</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="modalType">Appointment Type</label>
            <select id="modalType" value={type} onChange={(e) => setType(e.target.value)}>
              {BOOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="modalDate">Date</label>
              <input id="modalDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="modalTime">Time</label>
              <input id="modalTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="modalClinic">Veterinary Clinic</label>
            <select id="modalClinic" value={vet} onChange={(e) => setVet(e.target.value)}>
              <option value="">Select a veterinarian</option>
              {vets.map((v) => (
                <option key={v._id} value={v._id}>
                  {v.name}
                  {v.clinic ? ` - ${v.clinic}` : ''}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button className="cancel-modal-btn" type="button" onClick={onClose}>
              Cancel
            </button>
            <button className="save-appointment-btn" type="submit" disabled={saving}>
              {saving ? 'Booking…' : 'Book Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}