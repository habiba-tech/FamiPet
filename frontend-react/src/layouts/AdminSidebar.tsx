import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

// Parity with frontend/admin/js/admin.js: sidebar brand, nav (FA icons), and
// the foot links (Back to App + Logout). Pages render their own topbar + cards
// inside `main.admin-main`, as in the Vanilla admin pages.

const NAV_ITEMS = [
  { page: 'dashboard', label: 'Dashboard', icon: 'fa-solid fa-chart-pie', to: '/app/admin' },
  { page: 'users', label: 'Users', icon: 'fa-solid fa-users', to: '/app/admin/users' },
  { page: 'pets', label: 'Pets', icon: 'fa-solid fa-paw', to: '/app/admin/pets' },
  { page: 'adoptions', label: 'Adoptions', icon: 'fa-solid fa-heart', to: '/app/admin/adoptions' },
  { page: 'lost-found', label: 'Lost & Found', icon: 'fa-solid fa-magnifying-glass', to: '/app/admin/lost-found' },
  { page: 'community', label: 'Community', icon: 'fa-solid fa-comments', to: '/app/admin/community' },
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
            <i className={item.icon} />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="admin-sidebar-foot">
        <Link to="/app/dashboard">
          <i className="fa-solid fa-arrow-left" />
          Back to App
        </Link>

        <a href="#" id="adminLogout" onClick={(e) => { e.preventDefault(); logout2() }}>
          <i className="fa-solid fa-right-from-bracket" />
          Logout
        </a>
      </div>
    </>
  )
}