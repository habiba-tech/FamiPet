// Report details modal — port of the Vanilla openDetailsModal (image, status,
// meta, location, date, description, contact person with Call/Message actions).
// Call opens tel: and Message opens a prefilled mailto: exactly as Vanilla;
// the "not available" cases keep the Vanilla alert() message.

import { useEffect } from 'react'
import { Icon } from '../../../components/shared/Icon'
import type { ReportView } from './lostFoundBase'

interface DetailsModalProps {
  report: ReportView
  onClose: () => void
}

// Prefilled mailto: `Regarding <name> - Lost & Found` (Vanilla message button).
function buildMailto(email: string, name: string, poster: string): string {
  const subject = encodeURIComponent(`Regarding ${name} - Lost & Found`)
  const body = encodeURIComponent(`Hello ${poster},\n\nI am contacting you regarding ${name}, listed on Famipet Lost & Found.`)
  return `mailto:${email}?subject=${subject}&body=${body}`
}

export function DetailsModal({ report, onClose }: DetailsModalProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const handleCall = () => {
    if (!report.phone) {
      window.alert('Phone number is not available.')
      return
    }
    window.location.href = `tel:${report.phone}`
  }

  const handleMessage = () => {
    if (!report.email) {
      window.alert('Email address is not available.')
      return
    }
    window.location.href = buildMailto(report.email, report.petName, report.poster)
  }

  const meta = [
    report.gender,
    report.breed || 'Not specified',
    report.color || 'Not specified',
  ].join(' • ')
  const statusText = report.kind === 'lost' ? 'LOST' : 'FOUND'

  return (
    <div
      className="lost-modal-overlay show"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="lost-modal details-modal">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>

        <img src={report.image} alt={report.petName} className="details-image" />

        <span className={`details-status ${report.kind}`}>{statusText}</span>

        <h2>{report.petName}</h2>

        <div className="detail-line">
          <Icon name="paw" />
          <span>{meta}</span>
        </div>

        <div className="detail-line">
          <Icon name="location-dot" />
          <span>{report.location || 'Location unknown'}</span>
        </div>

        <div className="detail-line">
          <Icon name="calendar-days" />
          <span>{report.dateDisplay}</span>
        </div>

        <div className="details-description">{report.description}</div>

        <div className="contact-person">
          <div className="contact-person-title">
            <i>
              <Icon name="user" />
            </i>
            <div>
              <strong>Contact Person</strong>
              <span>{report.poster}</span>
            </div>
          </div>

          <div className="contact-actions">
            <button className="contact-btn call-btn" type="button" onClick={handleCall}>
              <Icon name="phone" /> Call
            </button>
            <button className="contact-btn message-btn" type="button" onClick={handleMessage}>
              <Icon name="envelope" /> Message
            </button>
          </div>
        </div>

        <button className="details-close-btn" type="button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  )
}