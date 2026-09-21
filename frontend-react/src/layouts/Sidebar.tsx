import { useLayoutEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'

// Parity with frontend/js/sidebar.js + sidebar.css: builds the universal app
// sidebar (brand, nav, pet decoration, profile), highlights the active page by
// path, toggles the mobile off-canvas state via `body.sidebar-open`, and
// navigates on profile/Logout clicks. Auth data (apiUser/annProfile) lands in
// Phase 7/23; until then the default profile renders as in Vanilla.

interface NavItem {
  page: string
  label: string
  icon: string
  to: string
  end?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { page: 'dashboard', label: 'Dashboard', icon: 'layout-grid', to: '/app/dashboard', end: true },
  { page: 'mypet', label: 'My Pets', icon: 'users-round', to: '/app/mypet', end: true },
  { page: 'adoption', label: 'Adoption', icon: 'heart', to: '/app/adoption', end: true },
  { page: 'health', label: 'Health', icon: 'activity', to: '/app/health', end: true },
  { page: 'appointments', label: 'Appointments', icon: 'calendar-check', to: '/app/appointments', end: true },
  { page: 'reminders', label: 'Reminders', icon: 'bell', to: '/app/reminders', end: true },
  { page: 'community', label: 'Community', icon: 'users', to: '/app/community', end: true },
  { page: 'lost-found', label: 'Lost & Found', icon: 'search', to: '/app/lost-found', end: true },
  { page: 'petgpt', label: 'PetGPT', icon: 'sparkles', to: '/app/petgpt', end: true },
  // breeds and admin cover subroutes (breed details, admin pages) like the
  // Vanilla file-name matching in sidebar.js
  { page: 'breeds', label: 'Pet Breeds', icon: 'paw-print', to: '/app/breeds' },
  { page: 'pet-id', label: 'Pet ID', icon: 'qrcode', to: '/app/pet-id', end: true },
  { page: 'settings', label: 'Settings', icon: 'settings', to: '/app/settings', end: true },
  // ponytail: Admin Panel shows unconditionally until auth gates it (Phase 7/23).
  { page: 'admin', label: 'Admin Panel', icon: 'shield', to: '/app/admin' },
]

const DEFAULT_PROFILE = { name: 'Pet Parent', role: 'Pet Owner', image: '' }

function getInitials(name: string) {
  const clean = String(name || '').trim()
  if (!clean) return 'PP'
  return clean
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function getSavedProfile() {
  try {
    const saved = localStorage.getItem('annProfile')
    if (saved) {
      return { ...DEFAULT_PROFILE, ...JSON.parse(saved) }
    }
  } catch {
    // fall through to defaults, as in sidebar.js
  }
  return { ...DEFAULT_PROFILE }
}

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const profile = getSavedProfile()

  // Lucide replaces `<i data-lucide>` with inline SVGs (same as sidebar.js).
  useLayoutEffect(() => {
    window.lucide?.createIcons()
  })

  const logout = () => {
    localStorage.clear()
    sessionStorage.clear()
    navigate('/login')
  }

  const isActive = (item: NavItem) =>
    item.to === pathname || (!item.end && pathname.startsWith(item.to))

  return (
    <aside className="ann-sidebar" id="annSidebar">
      <div className="sidebar-brand">
        <div className="brand-logo">
          <img src="/assets/logos/Famipet.png" alt="Famipet Logo" />
        </div>

        <div className="brand-text">
          <h2>Famipet</h2>
          <span>Pet Care &amp; Community</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map((item) => (
          <Link
            key={item.page}
            to={item.to}
            data-page={item.page}
            className={`ann-nav-item${isActive(item) ? ' active' : ''}`}
            onClick={onNavigate}
          >
            <i data-lucide={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}

        <a href="#" className="ann-nav-item" id="sidebarLogout" onClick={(e) => { e.preventDefault(); logout() }}>
          <i data-lucide="log-out" />
          <span>Logout</span>
        </a>
      </nav>

      <div className="sidebar-pet-decoration">
        <img src="/assets/images/dashboard/cute-pet.svg" alt="Cute pets" />
      </div>

      <button type="button" className="sidebar-profile" id="sidebarProfile" onClick={() => navigate('/app/settings')}>
        <div className="profile-avatar" id="sidebarAvatar">
          <span className="profile-initials">{getInitials(profile.name)}</span>
        </div>

        <div className="profile-info">
          <strong>{profile.name}</strong>
          <span>{profile.role}</span>
        </div>

        <i data-lucide="chevron-down" className="profile-arrow" />
      </button>
    </aside>
  )
}