// Phase 12 Appointments — Reschedule modal. React port of openRescheduleModal
// in frontend/js/appointments.js: shows the pet + type, pre-fills date with the
// current appointment date, and PUTs the new date/time to /appointments/:id.
// Inline error + toast instead of alert() per the Phase 9/10/11 conventions.

import { useEffect, useState, type FormEvent } from 'react'
import { updateAppointment } from '../../../api/appointments'
import { Icon } from '../../../components/shared/Icon'
import type { AppointmentView } from './appointmentsBase'

interface Props {
  appointment: AppointmentView
  onClose: () => void
  onSaved: () => Promise<void> | void
}

export function RescheduleModal({ appointment, onClose, onSaved }: Props) {
  const [date, setDate] = useState(appointment.date)
  const [time, setTime] = useState('')
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
    if (!date) {
      setError('Please select a new date.')
      return
    }
    setError('')
    setSaving(true)
    try {
      await updateAppointment(appointment.id, time ? { date, time } : { date })
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to reschedule appointment. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="appointment-modal open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box reschedule-box" role="dialog" aria-modal="true" aria-label="Reschedule Appointment">
        <div className="modal-header">
          <div>
            <span className="section-label">RESCHEDULE</span>
            <h2>Reschedule Appointment</h2>
          </div>
          <button className="close-modal" type="button" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="reschedule-pet-info">
          <div className="reschedule-icon">
            <Icon name="calendar" />
          </div>
          <div>
            <strong>{appointment.pet}</strong>
            <span>{appointment.type}</span>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="rescheduleDate">Select New Date</label>
            <input id="rescheduleDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div className="form-group">
            <label htmlFor="rescheduleTime">Select New Time</label>
            <input id="rescheduleTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
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
              <Icon name="calendar-check" />
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}