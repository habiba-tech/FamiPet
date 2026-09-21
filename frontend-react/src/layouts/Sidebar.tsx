import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useLayoutEffect } from 'react'

// Parity with frontend/js/sidebar.js + sidebar.css: builds the universal app
// sidebar (brand, nav, pet decoration, profile), highlights the active page by
// path, toggles the mobile off-canvas state via `body.sidebar-open`, and
// navigates on profile/Logout clicks. Auth data comes from the AuthContext
// (Phase 7); the Admin Panel item renders only for admins and logout goes
// through the shared auth logout (which keeps the theme, unlike
// localStorage.clear).

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
  // ponytail: admin route group is mounted only when `isAdmin`, so the panel
  // is gated by the backend role (RequireAdmin) rather than by hiding the link.
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

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { user, logout } = useAuth()

  const profileName = user?.name || DEFAULT_PROFILE.name
  const profileRole = user?.role === 'admin' ? 'Admin' : DEFAULT_PROFILE.role
  const profileImage = user?.avatar || ''
  const navItems = user?.role === 'admin' ? NAV_ITEMS : NAV_ITEMS.filter((i) => i.page !== 'admin')

  // Lucide replaces `<i data-lucide>` with inline SVGs (same as sidebar.js).
  useLayoutEffect(() => {
    window.lucide?.createIcons()
  })

  const logout2 = () => {
    logout()
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
        {navItems.map((item) => (
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

        <a href="#" className="ann-nav-item" id="sidebarLogout" onClick={(e) => { e.preventDefault(); logout2() }}>
          <i data-lucide="log-out" />
          <span>Logout</span>
        </a>
      </nav>

      <div className="sidebar-pet-decoration">
        <img src="/assets/images/dashboard/cute-pet.svg" alt="Cute pets" />
      </div>

      <button type="button" className="sidebar-profile" id="sidebarProfile" onClick={() => navigate('/app/settings')}>
        <div className="profile-avatar" id="sidebarAvatar">
          {profileImage ? (
            <img src={profileImage} alt={profileName} />
          ) : (
            <span className="profile-initials">{getInitials(profileName)}</span>
          )}
        </div>

        <div className="profile-info">
          <strong>{profileName}</strong>
          <span>{profileRole}</span>
        </div>

        <i data-lucide="chevron-down" className="profile-arrow" />
      </button>
    </aside>
  )
}