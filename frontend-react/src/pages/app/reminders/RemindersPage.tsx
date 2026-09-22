// Phase 14 Reminders — React port of frontend/pages/reminders.html +
// frontend/js/reminders.js.
//
// Deltas from the Vanilla page (documented in migration.md Phase 14):
// - Stats are real: Upcoming (not completed), Completed, Overdue (past date &
//   not completed), All. Vanilla hardcoded 5/12/1/18 and fake "Next in 2 days".
// - Loading/empty/error states render real messages instead of alert() +
//   static rows; form errors render inline; the more-menu complete action
//   reloads from the API instead of mutating local state only (so completion
//   survives refresh).
// - Success feedback uses the page toast instead of alert(); delete keeps
//   window.confirm (HealthPage/AppointmentsPage parity).
// - Pet "datalist" free-text input becomes a select of the user's real pets
//   (AGENTS §3 owner-linked); the backend still verifies pet ownership.
// - Calendar starts on the current month (Vanilla hardcoded May 2025) and the
//   dots come from real reminders; the legend stays the static 5-type legend.
// - No notification bell: the Vanilla page header has none (search + Add only),
//   matching the old surface exactly.

import { useEffect, useMemo, useRef, useState } from 'react'
import { completeReminder, deleteReminder, getReminders } from '../../../api/reminders'
import { getMyPets } from '../../../api/pets'
import { Icon } from '../../../components/shared/Icon'
import { toPetView, type PetView } from '../mypet/petBase'
import { ReminderFormModal } from './ReminderFormModal'
import {
  formatDisplayDate,
  getDaysText,
  toReminderView,
  type ReminderView,
} from './remindersBase'

export function RemindersPage() {
  const [pets, setPets] = useState<PetView[]>([])
  const [reminders, setReminders] = useState<ReminderView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [query, setQuery] = useState('')
  const [showingAll, setShowingAll] = useState(false)
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<ReminderView | null>(null)
  const [message, setMessage] = useState('')

  const menuRef = useRef<HTMLDivElement>(null)
  const isRequestInFlight = useRef(false)

  const loadData = () => {
    setLoadFailed(false)
    Promise.all([getMyPets(), getReminders()])
      .then(([petsRes, remRes]) => {
        setPets((petsRes.pets || []).map(toPetView))
        setReminders((remRes.reminders || []).map(toReminderView))
      })
      .catch(() => {
        setPets([])
        setReminders([])
        setLoadFailed(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  // Toast — same auto-dismiss behavior as the appointments page toast.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 2500)
    return () => clearTimeout(t)
  }, [message])

  const reload = async () => {
    const remRes = await getReminders()
    setReminders((remRes.reminders || []).map(toReminderView))
  }

  // Click outside closes the more-menu.
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setMenu(null)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  /* ---------------- STATS ---------------- */

  const stats = useMemo(() => {
    const list = reminders || []
    const today = new Date().toISOString().slice(0, 10)
    const upcoming = list.filter((r) => r.status !== 'Completed')
    const completed = list.filter((r) => r.status === 'Completed')
    const overdue = list.filter((r) => r.status !== 'Completed' && r.date < today)
    const sortedUpcoming = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))
    return {
      upcoming: upcoming.length,
      completed: completed.length,
      overdue: overdue.length,
      total: list.length,
      next: sortedUpcoming.length ? `Next in ${getDaysText(sortedUpcoming[0].date)}` : 'No upcoming reminders',
    }
  }, [reminders])

  /* ---------------- LIST VIEW ---------------- */

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = reminders || []
    let matches = list
    if (q) {
      matches = list.filter((r) => r.pet.toLowerCase().includes(q) || r.type.toLowerCase().includes(q))
    }
    // Normal view = first 4 (Vanilla slice); searching shows all matches.
    if (q || showingAll) return matches
    return matches.slice(0, 4)
  }, [reminders, query, showingAll])

  const openMenu = (e: React.MouseEvent) => {
    e.stopPropagation()
    const btn = e.currentTarget as HTMLElement
    const id = String(btn.dataset.id || '')
    if (menu?.id === id) {
      setMenu(null)
      return
    }
    const rect = btn.getBoundingClientRect()
    setMenu({ id, x: rect.left, y: rect.bottom + 4 })
  }

  useEffect(() => {
    if (!menu) return
    const el = document.querySelector(`[data-menu-id="${menu.id}"]`)
    el?.scrollIntoView({ block: 'nearest' })
  }, [menu])

  const runAction = async (fn: () => Promise<void>, success: string) => {
    if (isRequestInFlight.current) return
    isRequestInFlight.current = true
    try {
      await fn()
      setMessage(success)
      await reload()
    } catch (err) {
      alert((err as Error).message || 'Something went wrong.')
    } finally {
      isRequestInFlight.current = false
      setMenu(null)
    }
  }

  const markComplete = (rem: ReminderView) =>
    runAction(() => completeReminder(rem.id).then(() => undefined), 'Reminder marked as completed!')

  const confirmDelete = (rem: ReminderView) => {
    if (!window.confirm(`Delete ${rem.type} reminder for ${rem.pet}?`)) return
    runAction(() => deleteReminder(rem.id).then(() => undefined), 'Reminder deleted successfully!')
  }

  /* ---------------- CALENDAR ---------------- */

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const byDate = new Map<string, ReminderView[]>()
    for (const r of reminders || []) {
      const list = byDate.get(r.date) || []
      list.push(r)
      byDate.set(r.date, list)
    }
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevDays = new Date(year, month, 0).getDate()
    const today = new Date().toISOString().slice(0, 10)
    const pad = (n: number) => String(n).padStart(2, '0')
    const cells: { day: number; other: boolean; isToday: boolean; events: ReminderView[] }[] = []
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, other: true, isToday: false, events: [] })
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`
      cells.push({ day: d, other: false, isToday: key === today, events: byDate.get(key) || [] })
    }
    const remaining = 42 - cells.length
    for (let i = 1; i <= remaining; i++) cells.push({ day: i, other: true, isToday: false, events: [] })
    return {
      monthLabel: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      cells,
    }
  }, [calendarDate, reminders])

  /* ---------------- RENDER ---------------- */

  if (loadFailed) {
    return (
      <div className="reminders-page">
        <div className="reminder-page">
          <div className="reminder-load-state">
            <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
            <div style={{ marginTop: 8 }}>Could not load your reminders.</div>
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="reminders-page">
      <header className="top-bar">
        <div className="page-title-group">
          <div className="title-row">
            <h1>
              Reminders <Icon name="bell" />
            </h1>
          </div>
          <p className="subtitle">Never miss important care for your furry family. 🐾</p>
        </div>

        <div className="top-bar-actions">
          <div className="search-box">
            <Icon name="magnifying-glass" />
            <input
              type="text"
              placeholder="Search reminders..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <button className="add-reminder-btn" type="button" onClick={() => { setEditing(null); setModalOpen(true) }}>
            <Icon name="plus" /> Add Reminder
          </button>
        </div>
      </header>

      <section className="reminder-page">
        {/* ================= STATS ================= */}
        <div className="reminder-stats">
          <div className="reminder-stat-card green">
            <div className="stat-icon">
              <Icon name="bell" />
            </div>
            <div>
              <span>Upcoming</span>
              <strong>{reminders === null ? '\u2013' : stats.upcoming}</strong>
              <small>{stats.next}</small>
            </div>
          </div>

          <div className="reminder-stat-card blue">
            <div className="stat-icon">
              <Icon name="circle-check" />
            </div>
            <div>
              <span>Completed</span>
              <strong>{reminders === null ? '\u2013' : stats.completed}</strong>
              <small>All time</small>
            </div>
          </div>

          <div className="reminder-stat-card orange">
            <div className="stat-icon">
              <Icon name="clock" />
            </div>
            <div>
              <span>Overdue</span>
              <strong>{reminders === null ? '\u2013' : stats.overdue}</strong>
              <small>Needs attention</small>
            </div>
          </div>

          <div className="reminder-stat-card purple">
            <div className="stat-icon">
              <Icon name="calendar" />
            </div>
            <div>
              <span>All Reminders</span>
              <strong>{reminders === null ? '\u2013' : stats.total}</strong>
              <small>Total reminders</small>
            </div>
          </div>
        </div>

        {/* ================= MAIN GRID ================= */}
        <div className="reminder-main-grid">
          {/* ================= UPCOMING ================= */}
          <div className="reminder-card upcoming-reminders">
            <div className="card-header">
              <div>
                <h2>Upcoming Reminders</h2>
              </div>
              <button
                className="view-all-btn"
                type="button"
                onClick={() => { setShowingAll((s) => !s); setMenu(null) }}
              >
                {showingAll ? 'Show Less' : 'View All'}
              </button>
            </div>

            <div className="reminder-list">
              {reminders === null ? (
                <div className="reminder-load-state">Loading reminders…</div>
              ) : visible.length === 0 ? (
                <div className="empty-reminders">
                  <div className="empty-reminder-icon">
                    <Icon name="bell-off" />
                  </div>
                  <h3>No reminders found</h3>
                  <p>Try another search or add a new reminder.</p>
                </div>
              ) : (
                visible.map((rem) => (
                  <div className="reminder-item" key={rem.id}>
                    <div className={`reminder-type ${rem.typeClass}`}>
                      <Icon name={rem.typeIcon} />
                    </div>

                    <div className="reminder-pet-image">
                      <img src={rem.image} alt={rem.pet} onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
                    </div>

                    <div className="reminder-info">
                      <h3>{rem.pet}</h3>
                      <strong className={`${rem.typeClass}-text`}>{rem.type}</strong>
                      <div className="reminder-meta">
                        <span>
                          <Icon name="calendar-days" />
                          {formatDisplayDate(rem.date)}
                        </span>
                        <span>
                          <Icon name="clock" />
                          {rem.time}
                        </span>
                      </div>
                    </div>

                    <div className="reminder-actions">
                      <span className={`days-badge ${rem.color}-badge`}>{getDaysText(rem.date)}</span>
                      <button
                        className="more-btn"
                        type="button"
                        data-menu-id={rem.id}
                        aria-label="Reminder options"
                        onClick={openMenu}
                      >
                        <Icon name="ellipsis" />
                      </button>

                      {menu?.id === rem.id && (
                        <div className="reminder-menu" ref={menuRef} style={{ top: menu.y, left: menu.x, position: 'fixed' }}>
                          <button type="button" onClick={() => markComplete(rem)}>
                            <Icon name="circle-check" />
                            Mark Completed
                          </button>
                          <button
                            type="button"
                            onClick={() => { setEditing(rem); setMenu(null); setModalOpen(true) }}
                          >
                            <Icon name="pen" />
                            Edit Reminder
                          </button>
                          <button type="button" className="delete-action" onClick={() => confirmDelete(rem)}>
                            <Icon name="trash-2" />
                            Delete Reminder
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {(reminders || []).length > 4 && (
              <button
                className="view-all-reminders"
                type="button"
                onClick={() => { setShowingAll((s) => !s); setMenu(null) }}
              >
                {showingAll ? 'Show Less' : 'View All Reminders'}
                <Icon name={showingAll ? 'arrow-up' : 'arrow-right'} />
              </button>
            )}
          </div>

          {/* ================= RIGHT COLUMN ================= */}
          <div className="right-column">
            <div className="reminder-card calendar-card">
              <div className="calendar-header">
                <h2>Reminder Calendar</h2>
                <div className="calendar-navigation">
                  <button
                    type="button"
                    aria-label="Previous month"
                    onClick={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}
                  >
                    <Icon name="chevron-left" />
                  </button>
                  <strong>{calendarCells.monthLabel}</strong>
                  <button
                    type="button"
                    aria-label="Next month"
                    onClick={() => setCalendarDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}
                  >
                    <Icon name="chevron-right" />
                  </button>
                </div>
              </div>

              <div className="calendar-weekdays">
                <span>Sun</span>
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
              </div>

              <div className="calendar-grid">
                {calendarCells.cells.map((cell, i) => (
                  <div
                    key={i}
                    className={`calendar-day${cell.other ? ' other-month' : ''}${cell.isToday ? ' today' : ''}${cell.events.length ? ` event-${cell.events[0].color}` : ''}`}
                    title={cell.events.map((e) => `${e.pet} - ${e.type}`).join('\n')}
                  >
                    {cell.day}
                  </div>
                ))}
              </div>

              <div className="calendar-legend">
                <span><i className="legend-dot green" /> Vaccination</span>
                <span><i className="legend-dot pink" /> Deworming</span>
                <span><i className="legend-dot orange" /> Flea Treatment</span>
                <span><i className="legend-dot blue" /> Grooming</span>
                <span><i className="legend-dot purple" /> Checkup</span>
              </div>
            </div>

            {/* ================= TIPS ================= */}
            <div className="reminder-card tips-card">
              <div className="tips-content">
                <h2>Helpful Tips</h2>
                <ul>
                  <li><i className="tips-check"><Icon name="check" /></i> Keep your pet&apos;s vaccinations up to date.</li>
                  <li><i className="tips-check"><Icon name="check" /></i> Regular deworming keeps your pet healthy.</li>
                  <li><i className="tips-check"><Icon name="check" /></i> Don&apos;t forget monthly flea &amp; tick prevention.</li>
                  <li><i className="tips-check"><Icon name="check" /></i> Routine checkups help detect issues early.</li>
                </ul>
              </div>
              <div className="tips-pet">
                <span>♥</span>
                <img src="/assets/images/dashboard/cute-pet.svg" alt="Cute pets" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {modalOpen && (
        <ReminderFormModal
          pets={pets}
          editing={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => {
            setShowingAll(true)
            setMessage('Reminder saved successfully!')
            return reload()
          }}
        />
      )}

      {message && (
        <div className="reminder-message show">
          <div className="message-icon">
            <Icon name="check" />
          </div>
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}