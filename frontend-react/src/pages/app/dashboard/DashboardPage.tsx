// Phase 8 Dashboard — React port of frontend/pages/dashboard.html + the
// behaviors in frontend/js/dashboard.js + frontend/js/dashboard-data.js.
//
// Deltas from the Vanilla page (documented in migration.md Phase 8):
// - Loading shows neutral placeholders instead of the static sample content
//   (fake pets Bobby/Luna + numbers 3/2/1/4); empty states render on error.
// - Light/Dark buttons set the theme directly (theme.js toggled from either).
// - Mobile nav is owned by AppLayout's toggle (the in-page hamburger is
//   dropped); links use React Router (View all / Calendar / Details / empty
//   state CTAs).

import { useEffect, useMemo, useRef, useState } from 'react'
import { getAppointments, type Appointment } from '../../../api/appointments'
import { getMyAdoptions, type Adoption } from '../../../api/adoptions'
import { getMe } from '../../../api/auth'
import { toggleFavorite } from '../../../api/favorites'
import { getNotifications, type AppNotification } from '../../../api/notifications'
import { getMyPets, type Pet } from '../../../api/pets'
import { getReminders, type Reminder } from '../../../api/reminders'
import { useAuth } from '../../../hooks/useAuth'
import { useTheme } from '../../../hooks/useTheme'
import { fmtDate } from '../../../lib/formatters'
import {
  ActivitySection,
  AppointmentSection,
  LoveCard,
  NotificationPanel,
  PetsSection,
  RemindersSection,
  StatCard,
  type ActivityItem,
} from './DashboardSections'

interface DashboardData {
  pets: Pet[] | null
  appointments: Appointment[] | null
  reminders: Reminder[] | null
  adoptions: Adoption[] | null
  notes: AppNotification[] | null
  favIds: Set<string>
}

const INITIAL: DashboardData = {
  pets: null,
  appointments: null,
  reminders: null,
  adoptions: null,
  notes: null,
  favIds: new Set(),
}

export function DashboardPage() {
  const { user } = useAuth()
  const { setDark, setLight } = useTheme()
  const [data, setData] = useState<DashboardData>(INITIAL)
  const [panelOpen, setPanelOpen] = useState(false)

  const panelRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLElement>(null)

  useEffect(() => {
    let cancelled = false
    const merge = (patch: Partial<DashboardData>) => {
      if (!cancelled) setData((d) => ({ ...d, ...patch }))
    }
    const warn = (label: string, e: unknown) => console.warn(label, (e as Error).message)

    getMyPets()
      .then((r) => merge({ pets: r.pets || [] }))
      .catch((e) => warn('Dashboard pets:', e))
    getAppointments()
      .then((r) => merge({ appointments: r.appointments || [] }))
      .catch((e) => warn('Dashboard appointments:', e))
    getReminders()
      .then((r) => merge({ reminders: r.reminders || [] }))
      .catch((e) => warn('Dashboard reminders:', e))
    getMyAdoptions()
      .then((r) => merge({ adoptions: r.adoptions || r.requests || [] }))
      .catch((e) => warn('Dashboard adoptions:', e))
    getNotifications()
      .then((r) => merge({ notes: r.notifications || [] }))
      .catch((e) => warn('Dashboard notifications:', e))
    getMe()
      .then((r) => {
        const favs = (r.user?.favorites as Array<{ _id?: string } | string> | undefined) || []
        merge({
          favIds: new Set(favs.map((f) => String(typeof f === 'string' ? f : f._id ?? '')).filter(Boolean)),
        })
      })
      .catch((e) => warn('Dashboard favorites:', e))

    return () => {
      cancelled = true
    }
  }, [])

  const upcoming = useMemo(
    () => (data.appointments || []).filter((a) => a.status === 'pending' || a.status === 'confirmed'),
    [data.appointments],
  )

  const activityItems: ActivityItem[] | null = useMemo(() => {
    if (data.notes === null || data.adoptions === null) return null
    const items: ActivityItem[] = []
    for (const n of data.notes.slice(0, 3)) {
      items.push({
        title: n.title || '',
        date: fmtDate(n.createdAt),
        icon: 'bell',
        color: 'lavender',
        status: n.isRead ? 'Completed' : 'New',
        cls: n.isRead ? 'completed' : 'new',
      })
    }
    for (const r of data.adoptions.slice(0, 3)) {
      const status = r.status || ''
      items.push({
        title: `Adoption request: ${(r.pet && r.pet.name) || 'pet'} (${status})`,
        date: fmtDate(r.createdAt),
        icon: 'heart',
        color: 'pink',
        status,
        cls: status.toLowerCase() === 'approved' ? 'completed' : 'upcoming',
      })
    }
    return items.slice(0, 3)
  }, [data.notes, data.adoptions])

  // panel open/close: bell toggles, click-outside + Escape close (dashboard.js §§9/17)
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (panelRef.current?.contains(e.target as Node) || bellRef.current?.contains(e.target as Node)) return
      setPanelOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPanelOpen(false)
    }
    document.addEventListener('click', onDocClick)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('click', onDocClick)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  // Ctrl/Cmd+K focuses search (dashboard.js §18)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        searchRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // search filters `.dashboard-card, .stat-card` by text; love-card is not
  // matched (dashboard.js §10 — the love-card is not a `.dashboard-card`)
  const onSearch = () => {
    const q = (searchRef.current?.value || '').trim().toLowerCase()
    const container = contentRef.current
    if (!container) return
    container.querySelectorAll('.dashboard-card, .stat-card').forEach((card) => {
      const el = card as HTMLElement
      el.style.display = !q || (card.textContent || '').toLowerCase().includes(q) ? '' : 'none'
    })
  }

  const toggleFav = async (petId: string, previouslyLiked: boolean) => {
    const flip = (d: DashboardData, liked: boolean) => {
      const next = new Set(d.favIds)
      if (liked) next.add(petId)
      else next.delete(petId)
      return { ...d, favIds: next }
    }
    setData((d) => flip(d, !previouslyLiked))
    try {
      const res = await toggleFavorite(petId)
      if (typeof res.isFavorite === 'boolean') {
        const liked = res.isFavorite
        setData((d) => flip(d, liked))
      }
    } catch {
      setData((d) => flip(d, previouslyLiked))
    }
  }

  const firstName = (user?.name || '').trim().split(/\s+/)[0] || ''
  const greeting = firstName ? `Good morning, ${firstName}! 🌸` : 'Good morning! 🌸'
  const unreadCount = (data.notes || []).filter((n) => !n.isRead).length

  return (
    <div className="dashboard-page">
      <header className="top-header">
        <div className="welcome-text">
          <h1>{greeting}</h1>
          <p>Here's what's happening with your furry family today.</p>
        </div>

        <div className="header-actions">
          <div className="search-bar">
            <i data-lucide="search" />
            <input
              ref={searchRef}
              type="text"
              id="dashboardSearch"
              placeholder="Search anything..."
              autoComplete="off"
              onInput={onSearch}
            />
          </div>

          <button className="theme-btn active" id="lightModeBtn" type="button" title="Light mode" aria-label="Light mode" onClick={setLight}>
            <i data-lucide="sun" />
          </button>

          <button className="theme-btn" id="darkModeBtn" type="button" title="Dark mode" aria-label="Dark mode" onClick={setDark}>
            <i data-lucide="moon" />
          </button>

          <button
            ref={bellRef}
            className="notification-btn"
            id="notificationBtn"
            type="button"
            aria-label="Notifications"
            title="Notifications"
            onClick={() => setPanelOpen((o) => !o)}
          >
            <i data-lucide="bell" />
            <span className="notification-count">{unreadCount || '0'}</span>
          </button>
        </div>
      </header>

      <div ref={panelRef}>
        <NotificationPanel open={panelOpen} notes={data.notes} onClose={() => setPanelOpen(false)} />
      </div>

      <section className="dashboard-content" ref={contentRef}>
        <div className="stats-grid">
          <StatCard icon="paw-print" label="My Pets" value={data.pets?.length ?? 0} href="/app/mypet" linkLabel="View all pets →" decoration="🐱" className="pets-card" />
          <StatCard icon="heart" label="Adoptions" value={data.adoptions?.length ?? 0} href="/app/adoption" linkLabel="View applications →" decoration="♡" className="adoption-card" />
          <StatCard icon="calendar-days" label="Appointments" value={upcoming.length} href="/app/appointments" linkLabel="Upcoming today →" decoration="🩺" className="appointment-card" />
          <StatCard icon="bell" label="Reminders" value={data.reminders?.length ?? 0} href="/app/reminders" linkLabel="View reminders →" decoration="♡" className="reminder-card" />
        </div>

        <div className="dashboard-grid">
          <PetsSection pets={data.pets} favIds={data.favIds} onToggleFavorite={toggleFav} />
          <AppointmentSection appointment={upcoming[0] || null} loading={data.appointments === null} />
          <ActivitySection items={activityItems} />
          <RemindersSection reminders={data.reminders} />
          <LoveCard />
        </div>
      </section>
    </div>
  )
}