import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { Icon } from '../components/shared/Icon'

// Parity with frontend/admin/js/admin.js: sidebar brand, nav, and the foot
// links (Back to App + Logout). Pages render their own topbar + cards inside
// `main.admin-main`, as in the Vanilla admin pages.

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'chart-pie', to: '/app/admin' },
  { page: 'users', label: 'Users', icon: 'users', to: '/app/admin/users' },
  { page: 'pets', label: 'Pets', icon: 'paw', to: '/app/admin/pets' },
  { page: 'adoptions', label: 'Adoptions', icon: 'heart', to: '/app/admin/adoptions' },
  { page: 'lost-found', label: 'Lost & Found', icon: 'search', to: '/app/admin/lost-found' },
  { page: 'community', label: 'Community', icon: 'comments', to: '/app/admin/community' },
]

export function AdminSidebar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { logout } = useAuth()

  const logout2 = () => {
    logout()
    navigate('/login')
  }

  return (
    <>
      <div className="admin-brand">
        <img src="/assets/images/dashboard/cute-pet.svg" alt="Famipet" />
        <h3>Famipet Admin</h3>
        <small>Control Panel</small>
      </div>

      <nav className="admin-nav">
        {NAV_ITEMS.map((item) => (
          <Link key={item.page} to={item.to} className={pathname === item.to ? 'active' : undefined}>
            <Icon name={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <Link to="/app/dashboard">
          <Icon name="arrow-left" />
          Back to App
        </Link>

        <a href="#" id="adminLogout" onClick={(e) => { e.preventDefault(); logout2() }}>
          <Icon name="right-from-bracket" />
          Logout
        </a>
      </div>
    </>
  )
}