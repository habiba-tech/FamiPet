// Phase 11 Vaccinations — React port of the "Vaccination Tracker" health-card
// in frontend/pages/health.html + js/health.js (renderVaccinations()).
//
// Deltas from Vanilla (documented in migration.md Phase 11):
// - Vanilla only listed the selected pet's vaccinations; add/edit/delete are
//   new (the phase requires CRUD and the backend endpoints already exist).
// - The tracker splits into an Upcoming section (from /vaccinations/upcoming,
//   pet-filtered — that endpoint is user-wide) and the pet vaccination history
//   below; a vaccine appears in exactly one section so no row duplicates.
// - Loading/error/empty states render real messages instead of alert().

import { useMemo, useState } from 'react'
import { deleteVaccination, type Vaccination } from '../../../../api/vaccinations'
import { Icon } from '../../../../components/shared/Icon'
import { isCompleted, petIdOf, vaccineDueLabel } from './vaccinationBase'
import { UpcomingList } from './UpcomingList'
import { VaccineFormModal } from './VaccineFormModal'

interface Props {
  petId: string
  petName: string
  vaccinations: Vaccination[] | null
  upcoming: Vaccination[] | null
  error: string
  onChanged: () => void
}

export function VaccinationCard({ petId, petName, vaccinations, upcoming, error, onChanged }: Props) {
  const [showAll, setShowAll] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Vaccination | null>(null)

  // Vaccinations that belong to the selected pet. /vaccinations returns the
  // whole user's records, so filter client-side exactly like health.js did.
  const petVaccines = useMemo(
    () => (vaccinations || []).filter((v) => petIdOf(v) === petId),
    [vaccinations, petId],
  )

  // Upcoming rows (backend endpoint is user-wide) restricted to this pet. Only
  // records that exist in petVaccines are trusted, so history excludes them.
  const upcomingForPet = useMemo(() => {
    const ids = new Set(petVaccines.map((v) => v._id))
    return (upcoming || []).filter((v) => ids.has(v._id))
  }, [upcoming, petVaccines])

  const history = useMemo(() => {
    const upcomingIds = new Set(upcomingForPet.map((v) => v._id))
    return petVaccines
      .filter((v) => !upcomingIds.has(v._id))
      .sort((a, b) =>
        String(b.vaccinationDate || b.createdAt || '').localeCompare(String(a.vaccinationDate || a.createdAt || '')),
      )
  }, [petVaccines, upcomingForPet])

  const visible = showAll ? history : history.slice(0, 3)

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (v: Vaccination) => {
    setEditing(v)
    setFormOpen(true)
  }

  const confirmDelete = async (v: Vaccination) => {
    if (!window.confirm('Delete this vaccination record? This cannot be undone.')) return
    try {
      await deleteVaccination(v._id)
      onChanged()
    } catch (err) {
      alert('Could not delete vaccination: ' + ((err as Error).message || 'Unknown error'))
    }
  }

  return (
    <section className="health-card vaccination-card">
      <div className="card-header">
        <div>
          <span className="section-label">VACCINATION</span>
          <h3>Vaccination Tracker</h3>
        </div>
        <button className="add-vaccine-btn" type="button" onClick={openCreate}>
          <Icon name="plus" /> Add
        </button>
      </div>

      {error ? (
        <div className="vaccination-state">
          {error}
          <button type="button" className="retry-btn" onClick={onChanged}>
            Retry
          </button>
        </div>
      ) : vaccinations === null ? (
        <div className="vaccination-state">Loading vaccinations…</div>
      ) : (
        <>
          <UpcomingList items={upcomingForPet} onEdit={openEdit} onDelete={confirmDelete} />

          {petVaccines.length === 0 ? (
            <div className="health-empty-state">No vaccination records for {petName}.</div>
          ) : (
            history.length > 0 && (
              <>
                <span className="vaccination-section-label">History</span>
                <div className="vaccination-list">
                  {visible.map((v) => (
                    <div className="vaccine-item" key={v._id}>
                      <div className={`vaccine-icon${isCompleted(v) ? '' : ' upcoming'}`}>
                        <Icon name={isCompleted(v) ? 'shield-check' : 'syringe'} />
                      </div>
                      <div className="vaccine-info">
                        <strong>{v.vaccineName || 'Unnamed vaccine'}</strong>
                        <span>{vaccineDueLabel(v.nextDueDate)}</span>
                      </div>
                      <span className={`status ${isCompleted(v) ? 'completed' : 'upcoming-status'}`}>
                        {isCompleted(v) && <Icon name="check" />}
                        {isCompleted(v) ? 'Done' : 'Upcoming'}
                      </span>
                      <div className="vaccine-actions">
                        <button type="button" className="record-action-btn" title="Edit vaccination" onClick={() => openEdit(v)}>
                          <Icon name="pen" />
                        </button>
                        <button type="button" className="record-action-btn delete" title="Delete vaccination" onClick={() => confirmDelete(v)}>
                          <Icon name="trash-can" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {history.length > 3 && (
                  <button className="view-all-btn" type="button" onClick={() => setShowAll((s) => !s)}>
                    {showAll ? 'Hide Vaccination History' : 'View Vaccination History'}
                    <Icon name={showAll ? 'arrow-up' : 'arrow-right'} />
                  </button>
                )}
              </>
            )
          )}
        </>
      )}

      {formOpen && <VaccineFormModal petId={petId} editing={editing} onClose={() => setFormOpen(false)} onSaved={onChanged} />}
    </section>
  )
}