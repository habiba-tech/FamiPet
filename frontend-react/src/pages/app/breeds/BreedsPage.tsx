// Phase 19 Pet Breeds — React port of frontend/pages/breeds.html +
// frontend/js/breeds.js.
//
// Deltas from the Vanilla page (documented in migration.md):
// - Grid renders real GET /breeds records only (AGENTS §5). Loading/empty/
//   error states are explicit instead of the static "Loading breeds..."/
//   console.error-only failure.
// - Species filter tabs (All/Dogs/Cats/Birds/Others) + name/origin search are
//   preserved; filtering happens client-side exactly like Vanilla (the backend
//   exposes ?species= too, but Vanilla fetched all and split locally — parity).
// - Notification bell shows real /notifications + unread badge + panel, like
//   the other migrated pages (Vanilla hardcoded a "0" badge — AGENTS §7).
// - Decorative emoji (🌸 ♡) are replaced by the bundled paw icon, matching the
//   icon convention of the other migrated pages.

import { useEffect, useMemo, useRef, useState } from 'react'
import { getBreeds, type Breed } from '../../../api/breeds'
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../../../api/notifications'
import { Icon } from '../../../components/shared/Icon'
import { BreedCard } from './BreedCard'
import { breedSearchText, SPECIES_TABS, type SpeciesTabValue } from './breedsBase'

export function BreedsPage() {
  const [breeds, setBreeds] = useState<Breed[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)

  const [query, setQuery] = useState('')
  const [species, setSpecies] = useState<SpeciesTabValue>('all')
  const [expandedId, setExpandedId] = useState('')

  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const bellRef = useRef<HTMLButtonElement>(null)

  const load = () => {
    setLoadFailed(false)
    Promise.all([getBreeds(), getNotifications()])
      .then(([res, notesRes]) => {
        setBreeds(res.breeds || [])
        setNotifications(notesRes.notifications || [])
      })
      .catch(() => {
        setNotifications([])
        setLoadFailed(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

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

  const unread = (notifications || []).filter((n) => !n.isRead).length

  const markAllRead = async () => {
    setNotifications((list) => (list || []).map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      /* ignore — optimistic update already applied */
    }
  }

  /* ---------------- FILTER (Vanilla renderBreeds filter) ---------------- */

  const visible = useMemo(() => {
    const list = breeds || []
    const search = query.trim().toLowerCase()
    return list.filter((b) => {
      const speciesMatch = species === 'all' || b.species === species
      const searchMatch = !search || breedSearchText(b).includes(search)
      return speciesMatch && searchMatch
    })
  }, [breeds, query, species])

  const clearFilters = () => {
    setQuery('')
    setSpecies('all')
  }

  /* ---------------- RENDER ---------------- */

  if (loadFailed && !breeds) {
    return (
      <div className="breeds-page">
        <div className="breeds-state">
          <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
          <div style={{ marginTop: 8 }}>Could not load breeds.</div>
          <button type="button" className="retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="breeds-page">
      {/* ================= HEADER ================= */}
      <header className="page-header">
        <div className="header-title">
          <h1>
            Pet Breeds
            <span className="title-paw">
              <Icon name="paw" />
            </span>
          </h1>
          <p>Explore dog, cat and other pet breeds to find the perfect match.</p>
        </div>

        <div className="header-actions">
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

      {/* ================= TOOLBAR ================= */}
      <section className="breeds-panel">
        <div className="breeds-toolbar">
          <div className="search-box">
            <Icon name="magnifying-glass" />
            <input
              type="text"
              placeholder="Search breeds..."
              autoComplete="off"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="breed-filter-tabs">
            {SPECIES_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`tab-btn${species === tab.value ? ' active' : ''}`}
                aria-pressed={species === tab.value}
                onClick={() => setSpecies(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* ================= GRID ================= */}
        <div className="breeds-grid">
          {breeds === null ? (
            <div className="breeds-state">
              <Icon name="paw" style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 12 }} />
              <h3>Loading breeds...</h3>
            </div>
          ) : (
            visible.map((breed) => (
              <BreedCard
                key={breed._id}
                breed={breed}
                expanded={expandedId === breed._id}
                onToggle={setExpandedId}
              />
            ))
          )}
        </div>

        {/* ================= EMPTY ================= */}
        {breeds !== null && visible.length === 0 && (
          <div className="breeds-state">
            <Icon name="paw" style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 12 }} />
            <h3>No breeds found</h3>
            <p style={{ marginTop: 8 }}>Try another search or filter.</p>
            <button type="button" className="retry-btn" onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}
      </section>
    </div>
  )
}