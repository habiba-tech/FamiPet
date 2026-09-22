// Phase 11 Vaccinations — "Upcoming" subsection of the Vaccination Tracker.
// Rows come from GET /vaccinations/upcoming (user-wide: Pending + due in the
// future) filtered to the selected pet in VaccinationCard — the backend has no
// pet-filtered endpoint, so the card owns the pet filter.

import type { Vaccination } from '../../../../api/vaccinations'
import { Icon } from '../../../../components/shared/Icon'
import { vaccineDueLabel } from './vaccinationBase'

interface Props {
  items: Vaccination[]
  onEdit: (v: Vaccination) => void
  onDelete: (v: Vaccination) => void
}

export function UpcomingList({ items, onEdit, onDelete }: Props) {
  if (!items.length) return null

  return (
    <div className="vaccination-upcoming">
      <span className="vaccination-section-label">Upcoming</span>
      {items.map((v) => (
        <div className="vaccine-item" key={v._id}>
          <div className="vaccine-icon upcoming">
            <Icon name="syringe" />
          </div>
          <div className="vaccine-info">
            <strong>{v.vaccineName || 'Unnamed vaccine'}</strong>
            <span>{vaccineDueLabel(v.nextDueDate)}</span>
          </div>
          <span className="status upcoming-status">Upcoming</span>
          <div className="vaccine-actions">
            <button type="button" className="record-action-btn" title="Edit vaccination" onClick={() => onEdit(v)}>
              <Icon name="pen" />
            </button>
            <button type="button" className="record-action-btn delete" title="Delete vaccination" onClick={() => onDelete(v)}>
              <Icon name="trash-can" />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}