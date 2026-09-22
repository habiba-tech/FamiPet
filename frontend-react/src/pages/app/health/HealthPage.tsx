// Phase 10 Health — React port of frontend/pages/health.html + frontend/js/health.js.
//
// Deltas from the Vanilla page (documented in migration.md Phase 10):
// - Feature scope: health records + pet selector only. Vaccination tracker
//   (Phase 11), Vet Appointment card (Phase 12), and the Nutrition card
//   (hardcoded "85% / well balanced" — fabricated data per AGENTS §5) are not
//   rendered; the Care Guide tips card stays (legitimate static content).
// - Records table: vanilla hardcoded a "Completed" status pill (backend has no
//   status field) — replaced with edit/delete actions so create/edit/delete
//   work on real records for the selected pet (empty state when none).
// - Stat cards: vaccination count comes from vaccination-type health records
//   (no /vaccinations in Phase 10); the always-true "Up to date" label is
//   replaced with honest text; weight shows "Checked" + date; next visit comes
//   from record.nextVisit.
// - Loading/error/empty states render real messages instead of alerts and
//   sample numbers.
// - "Book Appointment" routes to /app/appointments (Phase 12 stub).
// - Record form shows inline errors instead of alert(); Vanilla only created
//   records — edit is new.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteHealthRecord, getHealthRecords, type HealthRecord } from '../../../api/health'
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../../../api/notifications'
import { getMyPets } from '../../../api/pets'
import { getUpcomingVaccinations, getVaccinations, type Vaccination } from '../../../api/vaccinations'
import { Icon } from '../../../components/shared/Icon'
import { HEALTH_SELECTED_PET_KEY } from '../../../lib/storage'
import { capFirst, toPetView, type PetView } from '../mypet/petBase'
import { FALLBACK_PET_IMAGE, formatDate, iconForRecord, petIdOf, toISO } from './healthBase'
import { RecordFormModal } from './RecordFormModal'
import { VaccinationCard } from './vaccinations/VaccinationCard'
import { petIdOf as vaccinePetIdOf } from './vaccinations/vaccinationBase'

export function HealthPage() {
  const navigate = useNavigate()

  const [pets, setPets] = useState<PetView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [records, setRecords] = useState<HealthRecord[] | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [vaccinations, setVaccinations] = useState<Vaccination[] | null>(null)
  const [upcoming, setUpcoming] = useState<Vaccination[] | null>(null)
  const [vaccineError, setVaccineError] = useState('')
  const [selectedPet, setSelectedPet] = useState('')
  const [query, setQuery] = useState('')
  const [showAll, setShowAll] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<HealthRecord | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const bellRef = useRef<HTMLButtonElement>(null)
  const recordsCardRef = useRef<HTMLDivElement>(null)

  // Vaccinations load independently so a /vaccinations failure shows an error
  // inside the tracker card instead of blanking the whole health page (parity
  // with vanilla health.js, which kept the page usable after its alert()).
  const loadVaccinations = () => {
    setVaccineError('')
    Promise.all([getVaccinations(), getUpcomingVaccinations()])
      .then(([listRes, upRes]) => {
        setVaccinations(listRes.vaccinations || [])
        setUpcoming(upRes.upcoming || [])
      })
      .catch((err) => {
        setVaccinations([])
        setUpcoming([])
        setVaccineError((err as Error).message || 'Could not load vaccinations.')
      })
  }

  const loadData = () => {
    setLoadFailed(false)
    Promise.all([getMyPets(), getHealthRecords(), getNotifications()])
      .then(([petsRes, recordsRes, notesRes]) => {
        const list = (petsRes.pets || []).map(toPetView)
        setPets(list)
        setRecords(recordsRes.records || [])
        setNotifications(notesRes.notifications || [])
        const saved = localStorage.getItem(HEALTH_SELECTED_PET_KEY) || ''
        setSelectedPet(list.some((p) => p.id === saved) ? saved : list.length ? list[0].id : '')
      })
      .catch(() => {
        setPets([])
        setRecords([])
        setNotifications([])
        setLoadFailed(true)
      })
    loadVaccinations()
  }

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const currentPet = useMemo(() => pets?.find((p) => p.id === selectedPet) || null, [pets, selectedPet])

  const petRecords = useMemo(() => {
    if (!records) return []
    return records
      .filter((r) => petIdOf(r) === selectedPet)
      .map((r) => ({
        id: r._id,
        record: r,
        date: toISO(r.visitDate) || toISO(r.createdAt) || '',
        type: r.diagnosis || 'General Checkup',
        vet: r.doctor || r.treatment || 'Not specified',
        notes: r.notes || '',
      }))
  }, [records, selectedPet])

  const stats = useMemo(() => {
    const vaccinationRecords = petRecords.filter((r) => r.type.toLowerCase().includes('vaccination'))
    // Prefer the real /vaccinations records (vanilla health.js: petVaccines
    // count, falling back to vaccination-type health records).
    const petVaccineCount = (vaccinations || []).filter((v) => vaccinePetIdOf(v) === selectedPet).length
    const weightRecord = petRecords
      .filter((r) => r.type.toLowerCase().includes('weight'))
      .sort((a, b) => b.date.localeCompare(a.date))[0]
    const futureVisits = petRecords
      .filter((r) => r.record.nextVisit)
      .map((r) => ({ date: new Date(r.record.nextVisit as string), record: r.record }))
      .filter((v) => !Number.isNaN(v.date.getTime()))
      .sort((a, b) => a.date.getTime() - b.date.getTime())
    const next = futureVisits[0]
    return {
      vaccinationCount: petVaccineCount || vaccinationRecords.length,
      vaccinationStatus: petVaccineCount
        ? petVaccineCount === 1
          ? '1 vaccine'
          : `${petVaccineCount} vaccines`
        : vaccinationRecords.length
          ? 'In health records'
          : 'None recorded',
      recordCount: petRecords.length,
      weightValue: weightRecord ? 'Checked' : '\u2014',
      weightStatus: weightRecord ? formatDate(weightRecord.record.visitDate || weightRecord.date) : 'No weight record',
      nextVisitValue: next ? next.date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '\u2014',
      nextVisitStatus: next ? 'Vet appointment' : 'No upcoming visits',
    }
  }, [petRecords, vaccinations, selectedPet])

  const visibleRecords = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = petRecords
      .filter((r) => (r.date + ' ' + r.type + ' ' + (r.vet || '') + ' ' + (r.notes || '')).toLowerCase().includes(q))
      .sort((a, b) => b.date.localeCompare(a.date))
    return showAll ? filtered : filtered.slice(0, 3)
  }, [petRecords, query, showAll])

  const unread = (notifications || []).filter((n) => !n.isRead).length

  const onSelectPet = (id: string) => {
    setSelectedPet(id)
    localStorage.setItem(HEALTH_SELECTED_PET_KEY, id)
    setShowAll(false)
  }

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (record: HealthRecord) => {
    setEditing(record)
    setFormOpen(true)
  }

  const confirmDelete = async (record: HealthRecord) => {
    if (!window.confirm('Delete this health record? This cannot be undone.')) return
    try {
      await deleteHealthRecord(record._id)
      setRecords((list) => (list || []).filter((r) => r._id !== record._id))
    } catch (err) {
      alert('Could not delete record: ' + ((err as Error).message || 'Unknown error'))
    }
  }

  const onSaved = async () => {
    const res = await getHealthRecords()
    setRecords(res.records || [])
    setShowAll(true)
  }

  const markAllRead = async () => {
    setNotifications((list) => (list || []).map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      /* ignore — optimistic update already applied */
    }
  }

  // click outside closes the notification panel
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bellRef.current?.contains(e.target as Node)) return
      setPanelOpen(false)
    }
    if (panelOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
    return undefined
  }, [panelOpen])

  if (loadFailed) {
    return (
      <div className="health-page">
        <div className="health-state">
          <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
          <div style={{ marginTop: 8 }}>Could not load your health data.</div>
          <button type="button" className="retry-btn" onClick={loadData}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="health-page">
      <header className="top-bar">
        <div className="page-title-group">
          <div className="title-row">
            <h1>
              Pet Health <Icon name="heart-pulse" />
            </h1>
          </div>
          <p className="subtitle">Keep track of your pet&apos;s health, wellness and medical records. 🐾</p>
        </div>

        <div className="top-bar-actions">
          <div className="search-box">
            <Icon name="magnifying-glass" />
            <input type="text" placeholder="Search health records..." value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>

          <div className="notification-wrapper">
            <button
              ref={bellRef}
              className="notification-btn"
              type="button"
              aria-label="Notifications"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((o) => !o)}
            >
              <Icon name="bell" />
              <span className="badge" style={{ display: unread ? 'flex' : 'none' }}>
                {unread}
              </span>
            </button>

            <div className={`notification-panel${panelOpen ? ' open' : ''}`}>
              <div className="notification-panel-header">
                <div>
                  <strong>Notifications</strong>
                  <span>{unread === 1 ? '1 unread' : unread + ' unread'}</span>
                </div>
                <button type="button" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>
              <div className="notification-list">
                {!notifications || notifications.length === 0 || unread === 0 ? (
                  <div className="notification-empty">You&apos;re all caught up!</div>
                ) : (
                  notifications.map((n) => (
                    <div className={`notification-item${n.isRead ? ' read' : ''}`} key={n._id}>
                      <span className="notification-dot" />
                      <div>
                        <strong>{n.title || ''}</strong>
                        <p>{n.message || ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button className="add-record-btn" type="button" onClick={openCreate} disabled={!currentPet}>
            <Icon name="plus" /> Add Health Record
          </button>
        </div>
      </header>

      {!currentPet ? (
        <div className="health-empty-state">
          {pets && pets.length === 0
            ? 'Add a pet from My Pets to start tracking health records.'
            : 'Select a pet to view their health records.'}
        </div>
      ) : (
        <>
          <div className="pet-selector">
            <div className="selector-left">
              <div className="pet-avatar">
                <img src={currentPet.image || FALLBACK_PET_IMAGE} alt={currentPet.name} />
              </div>
              <div>
                <span className="small-label">Currently viewing</span>
                <h2>{currentPet.name}</h2>
                <p>{capFirst(currentPet.species) || 'Pet'}</p>
              </div>
            </div>

            <div className="selector-right">
              <label htmlFor="petSelect">Select Pet</label>
              <select id="petSelect" value={selectedPet} onChange={(e) => onSelectPet(e.target.value)}>
                {(pets || []).map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <section className="health-hero">
            <div className="health-hero-content">
              <span className="hero-tag">
                <Icon name="shield-heart" /> HEALTH &amp; WELLNESS
              </span>
              <h2>
                Healthy Pets,
                <br />
                Happy Hearts. 💚
              </h2>
              <p>Stay on top of vaccinations, medical records, nutrition and your pet&apos;s overall wellbeing.</p>

              <div className="hero-actions">
                <button
                  className="primary-health-btn"
                  type="button"
                  onClick={() => recordsCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                >
                  <Icon name="file-medical" /> View Health Records
                </button>
                <button className="secondary-health-btn" type="button" onClick={() => navigate('/app/appointments')}>
                  <Icon name="calendar-check" /> Book Appointment
                </button>
              </div>
            </div>

            <div className="health-hero-art">
              <div className="hero-circle circle-one" />
              <div className="hero-circle circle-two" />
              <img src={currentPet.image || FALLBACK_PET_IMAGE} alt={`${currentPet.name} healthy pet`} />
            </div>
          </section>

          <section className="health-stats">
            <div className="health-stat-card">
              <div className="stat-icon mint">
                <Icon name="syringe" />
              </div>
              <div>
                <span>Vaccinations</span>
                <strong>{stats.vaccinationCount}</strong>
                <small>{stats.vaccinationStatus}</small>
              </div>
            </div>

            <div className="health-stat-card">
              <div className="stat-icon blue">
                <Icon name="file-medical" />
              </div>
              <div>
                <span>Health Records</span>
                <strong>{stats.recordCount}</strong>
                <small>Total records</small>
              </div>
            </div>

            <div className="health-stat-card">
              <div className="stat-icon orange">
                <Icon name="weight-scale" />
              </div>
              <div>
                <span>Weight</span>
                <strong>{stats.weightValue}</strong>
                <small>{stats.weightStatus}</small>
              </div>
            </div>

            <div className="health-stat-card">
              <div className="stat-icon pink">
                <Icon name="calendar-check" />
              </div>
              <div>
                <span>Next Visit</span>
                <strong>{stats.nextVisitValue}</strong>
                <small>{stats.nextVisitStatus}</small>
              </div>
            </div>
          </section>

          <section className="health-grid">
            <VaccinationCard
              petId={currentPet.id}
              petName={currentPet.name}
              vaccinations={vaccinations}
              upcoming={upcoming}
              error={vaccineError}
              onChanged={loadVaccinations}
            />

            <div className="health-card tips-card">
              <div className="card-header">
                <div>
                  <span className="section-label">CARE GUIDE</span>
                  <h3>Health Tips</h3>
                </div>
                <Icon name="lightbulb" className="tips-icon" />
              </div>

              <div className="tip-item">
                <div className="tip-number">01</div>
                <div>
                  <strong>Regular Checkups</strong>
                  <p>Schedule routine veterinary visits to monitor your pet&apos;s health.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">02</div>
                <div>
                  <strong>Keep Them Active</strong>
                  <p>Daily exercise helps maintain a healthy weight and good mood.</p>
                </div>
              </div>

              <div className="tip-item">
                <div className="tip-number">03</div>
                <div>
                  <strong>Fresh Water</strong>
                  <p>Make sure clean drinking water is available throughout the day.</p>
                </div>
              </div>
            </div>
          </section>

          <section className="records-card" ref={recordsCardRef}>
            <div className="records-header">
              <div>
                <span className="section-label">MEDICAL HISTORY</span>
                <h3>Recent Health Records</h3>
              </div>
              <button className="view-records-btn" type="button" onClick={() => setShowAll((s) => !s)}>
                {showAll ? 'Show Less' : 'View All'} <Icon name={showAll ? 'arrow-up' : 'arrow-right'} />
              </button>
            </div>

            <div className="records-table">
              <div className="table-row table-head">
                <span>Date</span>
                <span>Record</span>
                <span>Veterinarian</span>
                <span>Actions</span>
              </div>

              {records === null ? (
                <div className="health-state">Loading health records…</div>
              ) : visibleRecords.length === 0 ? (
                <div className="health-empty-state">No health records found for {currentPet.name}.</div>
              ) : (
                visibleRecords.map((r) => (
                  <div className="table-row" key={r.id}>
                    <span>{formatDate(r.date)}</span>
                    <div className="record-name">
                      <div className="record-icon">
                        <Icon name={iconForRecord(r.type)} />
                      </div>
                      <strong>{r.type}</strong>
                    </div>
                    <span>{r.vet || 'Not specified'}</span>
                    <div className="record-actions">
                      <button className="record-action-btn" type="button" title="Edit record" onClick={() => openEdit(r.record)}>
                        <Icon name="pen" />
                      </button>
                      <button className="record-action-btn delete" type="button" title="Delete record" onClick={() => confirmDelete(r.record)}>
                        <Icon name="trash-can" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </>
      )}

      {formOpen && currentPet && (
        <RecordFormModal petId={currentPet.id} editing={editing} onClose={() => setFormOpen(false)} onSaved={onSaved} />
      )}
    </div>
  )
}