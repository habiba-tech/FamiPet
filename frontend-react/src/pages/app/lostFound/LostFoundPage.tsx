// Phase 16 Lost & Found — React port of frontend/pages/lost-found.html +
// frontend/js/lost-found.js.
//
// Deltas from the Vanilla page (documented in migration.md):
// - Grid renders real /lost-found reports (Vanilla shipped static demo cards
//   that its JS replaced on load; a genuine empty state shows instead of the
//   demo cards, and loading shows a neutral state — AGENTS §5).
// - Notification bell shows real /notifications + unread badge and the shared
//   panel (Vanilla hardcoded a "3" badge and three fake items — AGENTS §7).
// - Create uses the backend's multer multipart path (FormData `image`) so
//   photos are stored under /uploads, not as inline base64 JSON.
// - Edit/Delete for own reports (3-dot menu on own cards) — the Vanilla page
//   had no edit/delete UI, but the backend exposes owner-only PUT and
//   owner-or-admin DELETE, and the phase plan requires CRUD. Backend still
//   enforces 403 on foreign reports.
// - Email and Age are dropped from the report form: the backend model stores
//   neither (Vanilla collected them but never sent them) — see Phase 9/12
//   precedent for non-persisted fields.
// - Feedback uses the page toast + alert for the "not available" call/message
//   guards (Vanilla behavior), form errors render inline.

import { useEffect, useMemo, useRef, useState } from 'react'
import { deleteReport, getReports } from '../../../api/lostFound'
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../../../api/notifications'
import { getUser } from '../../../api/client'
import { Icon } from '../../../components/shared/Icon'
import { DetailsModal } from './DetailsModal'
import { ReportCard } from './ReportCard'
import { ReportFormModal } from './ReportFormModal'
import {
  FILTER_TABS,
  LOCATION_OPTIONS,
  reportSearchText,
  SORT_OPTIONS,
  toReportView,
  TYPE_OPTIONS,
  type ReportView,
} from './lostFoundBase'

export function LostFoundPage() {
  const currentUser = getUser()
  const currentUserId = currentUser?.id

  const [reports, setReports] = useState<ReportView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [query, setQuery] = useState('')
  const [statusTab, setStatusTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [locationFilter, setLocationFilter] = useState('all')
  const [sortFilter, setSortFilter] = useState('recent')

  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [menu, setMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [message, setMessage] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [formKind, setFormKind] = useState<'lost' | 'found'>('lost')
  const [editing, setEditing] = useState<ReportView | null>(null)
  const [details, setDetails] = useState<ReportView | null>(null)

  const bellRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const load = () => {
    setLoadFailed(false)
    Promise.all([getReports(), getNotifications()])
      .then(([res, notesRes]) => {
        setReports((res.reports || []).map((r) => toReportView(r, currentUserId)))
        setNotifications(notesRes.notifications || [])
      })
      .catch(() => {
        setNotifications([])
        setLoadFailed(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  // Toast — same auto-dismiss behavior as the reminders/appointments pages.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 2500)
    return () => clearTimeout(t)
  }, [message])

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

  // click outside + Escape close the report more-menu
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

  const unread = (notifications || []).filter((n) => !n.isRead).length

  const markAllRead = async () => {
    setNotifications((list) => (list || []).map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      /* ignore — optimistic update already applied */
    }
  }

  const reload = async () => {
    const res = await getReports()
    setReports((res.reports || []).map((r) => toReportView(r, currentUserId)))
  }

  /* ---------------- FILTER / SORT (Vanilla renderCards + sortCards) ---------------- */

  const visible = useMemo(() => {
    const list = reports || []
    const search = query.trim().toLowerCase()
    const filtered = list.filter((r) => {
      const statusMatch = statusTab === 'all' || r.kind === statusTab
      const typeMatch = typeFilter === 'all' || r.species === typeFilter
      const locationMatch = locationFilter === 'all' || r.locationBucket === locationFilter
      const searchMatch = !search || reportSearchText(r).includes(search)
      return statusMatch && typeMatch && locationMatch && searchMatch
    })
    return [...filtered].sort((a, b) => {
      if (sortFilter === 'oldest') return toMs(a.date) - toMs(b.date)
      if (sortFilter === 'name') return a.petName.localeCompare(b.petName)
      return toMs(b.date) - toMs(a.date)
    })
  }, [reports, query, statusTab, typeFilter, locationFilter, sortFilter])

  const clearFilters = () => {
    setQuery('')
    setStatusTab('all')
    setTypeFilter('all')
    setLocationFilter('all')
    setSortFilter('recent')
  }

  /* ---------------- ACTIONS ---------------- */

  const openReport = (kind: 'lost' | 'found') => {
    setEditing(null)
    setFormKind(kind)
    setFormOpen(true)
  }

  const openMenu = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    const btn = e.currentTarget as HTMLElement
    if (menu?.id === id) {
      setMenu(null)
      return
    }
    const rect = btn.getBoundingClientRect()
    setMenu({ id, x: rect.left, y: rect.bottom + 4 })
  }

  const openEdit = (r: ReportView) => {
    setMenu(null)
    setEditing(r)
    setFormKind(r.kind)
    setFormOpen(true)
  }

  const confirmDelete = async (r: ReportView) => {
    setMenu(null)
    if (!window.confirm(`Are you sure you want to delete the ${r.kind} report for ${r.petName}?`)) return
    try {
      await deleteReport(r.id)
      setMessage('Report deleted successfully.')
      await reload()
    } catch (err) {
      setMessage((err instanceof Error && err.message) || 'Could not delete the report.')
    }
  }

  const handleSaved = async (msg: string) => {
    setFormOpen(false)
    setMessage(msg)
    try {
      await reload()
    } catch {
      /* keep current list; success toast already shown */
    }
  }

  /* ---------------- RENDER ---------------- */

  if (loadFailed && !reports) {
    return (
      <div className="lostfound-page">
        <div className="lost-state">
          <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
          <div style={{ marginTop: 8 }}>Could not load lost &amp; found reports.</div>
          <button type="button" className="retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="lostfound-page">
      {/* ================= HEADER ================= */}
      <header className="page-header">
        <div className="header-title">
          <h1>
            Lost &amp; Found
            <span className="title-paw">
              <Icon name="paw" />
            </span>
          </h1>
          <p>Help pets find their way back home.</p>
        </div>

        <div className="header-actions">
          <div className="search-box">
            <Icon name="magnifying-glass" />
            <input
              type="text"
              placeholder="Search lost or found pets..."
              autoComplete="off"
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
        </div>
      </header>

      {/* ================= HERO ================= */}
      <section className="lost-hero">
        <div className="hero-content">
          <span className="hero-label">FIND • REUNITE • CARE</span>
          <h2>
            Every Pet deserves <span>to be home.</span>
          </h2>
          <p>Report a lost pet or help reunite a pet with their loving family.</p>
        </div>

        <div className="hero-image-wrapper">
          <div className="hero-image-backdrop" />
          <img src="/assets/images/lost-found/petimg.png" alt="Pets being reunited" className="hero-pet-image" />
          <span className="hero-decoration decoration-one">
            <Icon name="heart" />
          </span>
          <span className="hero-decoration decoration-two">
            <Icon name="paw" />
          </span>
        </div>

        <div className="hero-actions">
          <button className="report-card lost" type="button" onClick={() => openReport('lost')}>
            <div className="report-icon">
              <Icon name="magnifying-glass" />
            </div>
            <div className="report-text">
              <strong>Report a Lost Pet</strong>
              <span>Let us know about your lost pet</span>
            </div>
            <Icon name="arrow-right" />
          </button>

          <button className="report-card found" type="button" onClick={() => openReport('found')}>
            <div className="report-icon">
              <Icon name="paw" />
            </div>
            <div className="report-text">
              <strong>Report a Found Pet</strong>
              <span>Help reunite them</span>
            </div>
            <Icon name="arrow-right" />
          </button>
        </div>
      </section>

      {/* ================= FILTER BAR ================= */}
      <section className="filter-bar">
        <div className="filter-tabs">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`filter-tab${statusTab === tab.value ? ' active' : ''}`}
              onClick={() => setStatusTab(tab.value)}
            >
              {tab.value !== 'all' && <Icon name="paw" />}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="filter-selects">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} aria-label="Filter by type">
            {TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select value={locationFilter} onChange={(e) => setLocationFilter(e.target.value)} aria-label="Filter by location">
            {LOCATION_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          <select value={sortFilter} onChange={(e) => setSortFilter(e.target.value)} aria-label="Sort reports">
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* ================= PET GRID ================= */}
      <section className="pets-grid">
        {reports === null ? (
          <div className="lost-load-state">
            <Icon name="circle-notch" spin />
            <span>Loading lost &amp; found reports...</span>
          </div>
        ) : (
          visible.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              menu={menu}
              menuRef={menuRef}
              onOpenMenu={openMenu}
              onDetails={(r) => setDetails(r)}
              onEdit={openEdit}
              onDelete={(r) => void confirmDelete(r)}
            />
          ))
        )}
      </section>

      {/* ================= NO RESULTS ================= */}
      {reports !== null && visible.length === 0 && (
        <div className="no-results">
          <div className="no-results-icon">
            <Icon name="paw" />
          </div>
          <h3>No pets found</h3>
          <p>Try changing your search or filters.</p>
          <button className="clear-filters-btn" type="button" onClick={clearFilters}>
            Clear Filters
          </button>
        </div>
      )}

      {/* ================= HELP TIP ================= */}
      <section className="help-tip">
        <div className="tip-icon">
          <Icon name="lightbulb" />
        </div>
        <p>
          <strong>Tip:</strong> If you see a pet that looks like yours, please contact the poster immediately.
        </p>
        <div className="tip-paws">
          <Icon name="paw" />
        </div>
      </section>

      {message && (
        <div className="lost-message show">
          <div className="message-icon">
            <Icon name="check" />
          </div>
          <span>{message}</span>
        </div>
      )}

      {formOpen && (
        <ReportFormModal
          kind={formKind}
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={(msg) => void handleSaved(msg)}
        />
      )}

      {details && <DetailsModal report={details} onClose={() => setDetails(null)} />}
    </div>
  )
}

function toMs(date: string): number {
  const t = Date.parse(date)
  return Number.isNaN(t) ? 0 : t
}