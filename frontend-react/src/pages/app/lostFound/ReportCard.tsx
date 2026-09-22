// Report card — port of the Vanilla lost-found grid card (createPetCard +
// the static .pet-card markup in lost-found.html). Deltas (documented in
// migration.md): the pet image resolves backend /uploads via assetUrl with the
// Vanilla fallback image; own reports get a 3-dot menu (Edit / Delete) —
// the Vanilla page had no edit/delete UI, but the backend supports owner-only
// PUT and owner-or-admin DELETE, and the phase plan requires CRUD.

import { Icon } from '../../../components/shared/Icon'
import { FALLBACK_IMAGE, type ReportView } from './lostFoundBase'

interface ReportCardProps {
  report: ReportView
  menu?: { id: string; x: number; y: number } | null
  menuRef: React.RefObject<HTMLDivElement | null>
  onOpenMenu: (e: React.MouseEvent, id: string) => void
  onDetails: (r: ReportView) => void
  onEdit: (r: ReportView) => void
  onDelete: (r: ReportView) => void
}

export function ReportCard({ report, menu, menuRef, onOpenMenu, onDetails, onEdit, onDelete }: ReportCardProps) {
  const statusText = report.kind === 'lost' ? 'LOST' : 'FOUND'
  return (
    <article className="pet-card">
      <div className="pet-image">
        <img
          src={report.image}
          alt={report.petName}
          onError={(e) => {
            if ((e.target as HTMLImageElement).src !== FALLBACK_IMAGE) {
              ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
            }
          }}
        />
        <span className={`status ${report.kind}`}>{statusText}</span>
        <span className="location-tag">
          <Icon name="location-dot" />
          {report.location || 'Location unknown'}
        </span>

        {report.isOwner && (
          <button
            className="report-more-btn"
            type="button"
            aria-label={`${report.petName} report options`}
            onClick={(e) => onOpenMenu(e, report.id)}
          >
            <Icon name="ellipsis" />
          </button>
        )}
      </div>

      <div className="pet-info">
        <h3>{report.petName}</h3>

        <div className="pet-meta">
          <span>
            <Icon name={report.genderIcon} />
            {report.gender}
          </span>
          <b>•</b>
          <span>{report.breed || 'Not specified'}</span>
          <b>•</b>
          <span>{report.color || 'Not specified'}</span>
        </div>

        <div className="pet-date">
          <Icon name="calendar-days" />
          {report.dateLabel} {report.dateDisplay}
        </div>

        <p>{report.description}</p>

        <button
          className={`details-btn${report.kind === 'found' ? ' found-btn' : ''}`}
          type="button"
          onClick={() => onDetails(report)}
        >
          View Details
          <Icon name="arrow-right" />
        </button>
      </div>

      {menu?.id === report.id && (
        <div className="report-menu" ref={menuRef} style={{ top: menu.y, left: menu.x, position: 'fixed' }}>
          <button type="button" onClick={() => onEdit(report)}>
            <Icon name="pen" />
            Edit Report
          </button>
          <button type="button" className="delete-action" onClick={() => onDelete(report)}>
            <Icon name="trash-2" />
            Delete Report
          </button>
        </div>
      )}
    </article>
  )
}