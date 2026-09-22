// Phase 12 Appointments — read-only details modal for a history item. React
// replacement for the Vanilla alert(chained-text) in appointments.js history
// click handler; renders the same fields (pet / type / doctor / date • time /
// clinic / status) as real content instead of an alert box.

import { useEffect } from 'react'
import { Icon } from '../../../components/shared/Icon'
import { formatDisplayDate, type AppointmentView } from './appointmentsBase'

interface Props {
  appointment: AppointmentView
  onClose: () => void
}

export function AppointmentDetailsModal({ appointment, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="appointment-modal open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-box reschedule-box" role="dialog" aria-modal="true" aria-label="Appointment Details">
        <div className="modal-header">
          <div>
            <span className="section-label">APPOINTMENT DETAILS</span>
            <h2>{appointment.pet}</h2>
          </div>
          <button className="close-modal" type="button" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <div className="reschedule-pet-info">
          <div className="reschedule-icon">
            <Icon name="stethoscope" />
          </div>
          <div>
            <strong>{appointment.type}</strong>
            <span>{appointment.clinic || 'No clinic specified'}</span>
          </div>
        </div>

        <div className="details-list">
          <div className="details-item">
            <span className="details-label">Veterinarian</span>
            <span className="details-value">
              <Icon name="user-doctor" /> {appointment.doctor}
            </span>
          </div>
          <div className="details-item">
            <span className="details-label">Date &amp; Time</span>
            <span className="details-value">
              <Icon name="calendar" /> {formatDisplayDate(appointment.date)}
              {appointment.time ? ` \u2022 ${appointment.time}` : ''}
            </span>
          </div>
          <div className="details-item">
            <span className="details-label">Clinic</span>
            <span className="details-value">
              <Icon name="location-dot" /> {appointment.clinic || 'Not specified'}
            </span>
          </div>
          <div className="details-item">
            <span className="details-label">Status</span>
            <span className={`details-status ${appointment.status}`}>{appointment.status}</span>
          </div>
        </div>

        <div className="modal-actions">
          <button className="save-appointment-btn" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}