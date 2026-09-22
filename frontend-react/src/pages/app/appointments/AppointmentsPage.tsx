// Phase 12 Appointments — React port of frontend/pages/appointments.html +
// frontend/js/appointments.js.
//
// Deltas from the Vanilla page (documented in migration.md Phase 12):
// - Notifications: Vanilla rendered only locally-created fake items that never
//   persisted (addNotification() pushed to an in-memory array). This page
//   loads real /notifications like the Dashboard/Health pages (AGENTS §7);
//   booking a visit also creates a real backend notification.
// - Success/failure feedback: Vanilla alert()/toast; this port uses the same
//   toast + inline form errors and window.confirm for cancellation (React
//   conventions from Phases 9-11). History "View Details" opens a read-only
//   modal instead of an alert.
// - Stats show real counts (Upcoming/Completed/Cancelled/Total + "Next:")
//   computed from /appointments; Vanilla hardcoded 2/8/1/11 and a fake "Next".
// - Calendar starts on the current month (Vanilla hardcoded August 2026 as its
//   initial date); appointment-day dots + the legend come from real records
//   (Vanilla legend was hardcoded "Bruno - Checkup"/"Luna - Vaccination").
// - "Set Reminder" quick action navigates to /app/reminders (Phase 14)
//   instead of fake-adding a notification + alerting (AGENTS §5).
// - Notification button was wired to the bell (Vanilla page had the button but
//   no handler); bell/sun parity as on the Health page.

import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { deleteAppointment, getAppointments } from '../../../api/appointments'
import {
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '../../../api/notifications'
import { getMyPets } from '../../../api/pets'
import { getVeterinarians, type Veterinarian } from '../../../api/veterinarians'
import { Icon } from '../../../components/shared/Icon'
import { toPetView, type PetView } from '../mypet/petBase'
import { AppointmentDetailsModal } from './AppointmentDetailsModal'
import { AppointmentFormModal } from './AppointmentFormModal'
import { RescheduleModal } from './RescheduleModal'
import { formatDisplayDate, toAppointmentView, type AppointmentView } from './appointmentsBase'

export function AppointmentsPage() {
  const navigate = useNavigate()

  const [pets, setPets] = useState<PetView[]>([])
  const [vets, setVets] = useState<Veterinarian[]>([])
  const [appointments, setAppointments] = useState<AppointmentView[] | null>(null)
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [query, setQuery] = useState('')
  const [calendarDate, setCalendarDate] = useState(() => new Date())
  const [bookOpen, setBookOpen] = useState(false)
  const [rescheduling, setRescheduling] = useState<AppointmentView | null>(null)
  const [details, setDetails] = useState<AppointmentView | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [message, setMessage] = useState('')

  const bellRef = useRef<HTMLButtonElement>(null)
  const historyCardRef = useRef<HTMLDivElement>(null)

  const loadData = () => {
    setLoadFailed(false)
    Promise.all([getMyPets(), getVeterinarians(), getAppointments(), getNotifications()])
      .then(([petsRes, vetsRes, apptsRes, notesRes]) => {
        setPets((petsRes.pets || []).map(toPetView))
        setVets((vetsRes.veterinarians || []).filter((v) => v.isActive !== false))
        setAppointments((apptsRes.appointments || []).map(toAppointmentView))
        setNotifications(notesRes.notifications || [])
      })
      .catch(() => {
        setPets([])
        setVets([])
        setAppointments([])
        setNotifications([])
        setLoadFailed(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData() }, [])

  // Toast — same auto-dismiss behavior as Vanilla showAppointmentMessage.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 2500)
    return () => clearTimeout(t)
  }, [message])

  const reload = async () => {
    const apptsRes = await getAppointments()
    const notesRes = await getNotifications()
    setAppointments((apptsRes.appointments || []).map(toAppointmentView))
    setNotifications(notesRes.notifications || [])
  }

  const unread = (notifications || []).filter((n) => !n.isRead).length

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

  const stats = useMemo(() => {
    const list = appointments || []
    const upcoming = list.filter((a) => a.status === 'upcoming')
    const completed = list.filter((a) => a.status === 'completed')
    const cancelled = list.filter((a) => a.status === 'cancelled')
    const sortedUpcoming = [...upcoming].sort((a, b) => a.date.localeCompare(b.date))
    return {
      upcoming: upcoming.length,
      completed: completed.length,
      cancelled: cancelled.length,
      total: list.length,
      next: sortedUpcoming.length ? `Next: ${formatDisplayDate(sortedUpcoming[0].date)}` : 'No upcoming visits',
    }
  }, [appointments])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return appointments
    return (appointments || []).filter(
      (a) =>
        a.pet.toLowerCase().includes(q) ||
        a.type.toLowerCase().includes(q) ||
        a.doctor.toLowerCase().includes(q) ||
        a.clinic.toLowerCase().includes(q),
    )
  }, [appointments, query])

  const upcomingView = (visible || []).filter((a) => a.status === 'upcoming')
  const historyView = (visible || []).filter((a) => a.status === 'completed' || a.status === 'cancelled')

  const cancelAppointment = async (appt: AppointmentView) => {
    if (!window.confirm(`Cancel ${appt.pet}'s appointment?`)) return
    try {
      await deleteAppointment(appt.id)
      setMessage('Appointment cancelled successfully!')
      await reload()
    } catch (err) {
      alert('Could not cancel appointment: ' + ((err as Error).message || 'Unknown error'))
    }
  }

  const onBooked = async () => {
    setMessage('Appointment booked successfully!')
    await reload()
  }

  const onRescheduled = async () => {
    setMessage('Appointment rescheduled successfully!')
    await reload()
  }

  /* ---------------- CALENDAR ---------------- */

  const calendarCells = useMemo(() => {
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const byDate = new Map<string, AppointmentView[]>()
    for (const a of appointments || []) {
      const list = byDate.get(a.date) || []
      list.push(a)
      byDate.set(a.date, list)
    }
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const prevDays = new Date(year, month, 0).getDate()
    const cells: { day: number; other: boolean; appts: AppointmentView[] }[] = []
    for (let i = firstDay - 1; i >= 0; i--) cells.push({ day: prevDays - i, other: true, appts: [] })
    const pad = (n: number) => String(n).padStart(2, '0')
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad(month + 1)}-${pad(d)}`
      cells.push({ day: d, other: false, appts: byDate.get(key) || [] })
    }
    const remaining = (7 - (cells.length % 7)) % 7
    for (let i = 1; i <= remaining; i++) cells.push({ day: i, other: true, appts: [] })
    return { monthLabel: new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }), cells }
  }, [calendarDate, appointments])

  const calendarLegend = useMemo(() => {
    const entries = new Set<string>()
    const year = calendarDate.getFullYear()
    const month = calendarDate.getMonth()
    const pad = (n: number) => String(n).padStart(2, '0')
    const prefix = `${year}-${pad(month + 1)}-`
    for (const a of appointments || []) {
      if (a.date.startsWith(prefix)) entries.add(`${a.pet} - ${a.type}`)
    }
    const list = [...entries].sort()
    if (list.length === 0) return [{ label: 'No appointments this month', pink: false }]
    return list.map((label) => ({ label, pink: label.toLowerCase().includes('vaccination') }))
  }, [calendarDate, appointments])

  if (loadFailed) {
    return (
      <div className="appointments-page">
        <div className="appointment-page">
          <div className="appointment-load-state">
            <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
            <div style={{ marginTop: 8 }}>Could not load your appointments.</div>
            <button type="button" className="retry-btn" onClick={loadData}>
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="appointments-page">
      <header className="top-bar">
        <div className="page-title-group">
          <div className="title-row">
            <h1>
              Appointments <Icon name="calendar-check" />
            </h1>
          </div>
          <p className="subtitle">Manage your pet&apos;s appointments and vet visits. 🐾</p>
        </div>

        <div className="top-bar-actions">
          <div className="search-box">
            <Icon name="magnifying-glass" />
            <input
              type="text"
              placeholder="Search appointments..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
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
                  <span>{unread === 1 ? '1 unread' : `${unread} unread`}</span>
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

          <button className="book-btn" type="button" onClick={() => setBookOpen(true)}>
            <Icon name="plus" /> Book New Appointment
          </button>
        </div>
      </header>

      <section className="appointment-page">
        {/* ================= STATS ================= */}
        <div className="appointment-stats">
          <div className="appointment-stat-card">
            <div className="stat-icon blue">
              <Icon name="calendar-days" />
            </div>
            <div>
              <span>Upcoming</span>
              <strong>{appointments === null ? '\u2013' : stats.upcoming}</strong>
              <small>{stats.next}</small>
            </div>
          </div>

          <div className="appointment-stat-card">
            <div className="stat-icon purple">
              <Icon name="calendar-check" />
            </div>
            <div>
              <span>Completed</span>
              <strong>{appointments === null ? '\u2013' : stats.completed}</strong>
              <small>All time</small>
            </div>
          </div>

          <div className="appointment-stat-card">
            <div className="stat-icon orange">
              <Icon name="clock-rotate-left" />
            </div>
            <div>
              <span>Cancelled</span>
              <strong>{appointments === null ? '\u2013' : stats.cancelled}</strong>
              <small>All time</small>
            </div>
          </div>

          <div className="appointment-stat-card">
            <div className="stat-icon pink">
              <Icon name="paw" />
            </div>
            <div>
              <span>Total</span>
              <strong>{appointments === null ? '\u2013' : stats.total}</strong>
              <small>Appointments</small>
            </div>
          </div>
        </div>

        {/* ================= MAIN TWO COLUMN ================= */}
        <div className="appointment-main-grid">
          <div className="appointment-card upcoming-card">
            <div className="card-header">
              <div>
                <span className="section-label">UPCOMING</span>
                <h2>Upcoming Appointments</h2>
              </div>
              <button className="view-all-btn" type="button" onClick={() => setQuery('')}>
                View all
              </button>
            </div>

            <div className="upcoming-list">
              {appointments === null ? (
                <div className="appointment-load-state">Loading upcoming appointments…</div>
              ) : upcomingView.length === 0 ? (
                <div className="empty-state">
                  <Icon name="calendar-xmark" style={{ fontSize: 20, opacity: 0.6 }} />
                  <br />
                  <br />
                  No upcoming appointments found.
                </div>
              ) : (
                upcomingView.map((item) => (
                  <div className="appointment-item" key={item.id}>
                    <div className="pet-photo">
                      <img src={item.image} alt={item.pet} />
                    </div>

                    <div className="appointment-info">
                      <h3>{item.pet}</h3>
                      <div className="appointment-type">
                        <Icon name="stethoscope" /> {item.type}
                      </div>
                      <div className="appointment-details">
                        <span>
                          <Icon name="user-doctor" /> {item.doctor}
                        </span>
                        <span>
                          <Icon name="calendar" /> {formatDisplayDate(item.date)}
                          {item.time ? ` \u2022 ${item.time}` : ''}
                        </span>
                        <span>
                          <Icon name="location-dot" /> {item.clinic}
                        </span>
                      </div>
                    </div>

                    <div className="status-column">
                      <span className="status-badge">Upcoming</span>
                      <div className="appointment-actions">
                        <button className="reschedule-btn" type="button" onClick={() => setRescheduling(item)}>
                          Reschedule
                        </button>
                        <button className="more-btn" type="button" title="Cancel appointment" onClick={() => cancelAppointment(item)}>
                          <Icon name="x" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* CALENDAR */}
          <div className="appointment-card calendar-card">
            <div className="card-header">
              <div>
                <span className="section-label">SCHEDULE</span>
                <h2>Calendar</h2>
              </div>
              <div className="calendar-controls">
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
                  className={`calendar-day${cell.other ? ' other-month' : ''}${cell.appts.length ? ' has-blue' : ''}`}
                  title={cell.appts.map((a) => `${a.pet} - ${a.type}${a.time ? ` - ${a.time}` : ''}`).join('\n')}
                  onClick={() => {
                    if (cell.appts.length) setDetails(cell.appts[0])
                  }}
                >
                  {cell.day}
                </div>
              ))}
            </div>

            <div className="calendar-legend">
              {calendarLegend.map((entry) => (
                <div key={entry.label}>
                  <span className={`legend-dot ${entry.pink ? 'pink-dot' : 'blue-dot'}`} />
                  {entry.label}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ================= LOWER GRID ================= */}
        <div className="appointment-lower-grid">
          <div className="appointment-card history-card" ref={historyCardRef}>
            <div className="card-header">
              <div>
                <span className="section-label">HISTORY</span>
                <h2>Appointment History</h2>
              </div>
              <button className="view-all-btn" type="button" onClick={() => setQuery('')}>
                View all
              </button>
            </div>

            <div className="history-list">
              {appointments === null ? (
                <div className="appointment-load-state">Loading appointment history…</div>
              ) : historyView.length === 0 ? (
                <div className="empty-state">No appointment history found.</div>
              ) : (
                historyView.map((item) => (
                  <div className="history-item" key={item.id}>
                    <div className="history-photo">
                      <img src={item.image} alt={item.pet} />
                    </div>
                    <div className="history-info">
                      <strong>{item.pet}</strong>
                      <span>
                        {item.type} • {formatDisplayDate(item.date)}
                      </span>
                    </div>
                    <span className={`history-status ${item.status}`}>{item.status}</span>
                    <button className="history-view-btn" type="button" onClick={() => setDetails(item)}>
                      View Details
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="appointment-card quick-actions-card">
            <div className="card-header">
              <div>
                <span className="section-label">QUICK ACTIONS</span>
                <h2>What would you like to do?</h2>
              </div>
            </div>

            <div className="quick-actions">
              <button className="quick-action blue-action" type="button" onClick={() => setBookOpen(true)}>
                <div className="quick-icon">
                  <Icon name="calendar-plus" />
                </div>
                <div>
                  <strong>Find a Vet</strong>
                  <span>Choose a veterinary service</span>
                </div>
              </button>

              <button className="quick-action purple-action" type="button" onClick={() => setMessage('Vet finder will be available soon.')}>
                <div className="quick-icon">
                  <Icon name="user-doctor" />
                </div>
                <div>
                  <strong>Vet Services</strong>
                  <span>Explore available veterinary services</span>
                </div>
              </button>

              <button
                className="quick-action lavender-action"
                type="button"
                onClick={() => historyCardRef.current?.scrollIntoView({ behavior: 'smooth' })}
              >
                <div className="quick-icon">
                  <Icon name="clock-rotate-left" />
                </div>
                <div>
                  <strong>Pet Health Records</strong>
                  <span>View your pet&apos;s health information</span>
                </div>
              </button>

              <button className="quick-action orange-action" type="button" onClick={() => navigate('/app/reminders')}>
                <div className="quick-icon">
                  <Icon name="bell" />
                </div>
                <div>
                  <strong>Set Reminder</strong>
                  <span>Get reminded before visits</span>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ================= WELLNESS BANNER ================= */}
        <div className="appointment-banner">
          <div className="banner-icon">
            <Icon name="heart" />
          </div>
          <div>
            <strong>Regular checkups keep your pet healthy and happy!</strong>
            <p>Don&apos;t forget to keep vaccinations and checkups up to date.</p>
          </div>
          <Icon name="paw" className="banner-paw" />
        </div>
      </section>

      {bookOpen && (
        <AppointmentFormModal pets={pets} vets={vets} onClose={() => setBookOpen(false)} onSaved={onBooked} />
      )}

      {rescheduling && (
        <RescheduleModal appointment={rescheduling} onClose={() => setRescheduling(null)} onSaved={onRescheduled} />
      )}

      {details && <AppointmentDetailsModal appointment={details} onClose={() => setDetails(null)} />}

      {message && (
        <div className="appointment-message show">
          <div className="message-icon">
            <Icon name="check" />
          </div>
          <span>{message}</span>
        </div>
      )}
    </div>
  )
}