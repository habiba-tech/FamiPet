import { Outlet } from 'react-router-dom'
import { AdminSidebar } from './AdminSidebar'

// Admin shell — matches the Vanilla admin page skeleton (admin.css: `.admin-wrap`
// > `aside.admin-sidebar` + `main.admin-main`). Pages render their own topbar
// and `.admin-card` bodies inside the outlet, exactly like the Vanilla pages.

export function AdminLayout() {
  return (
    <div className="admin-wrap">
      <aside className="admin-sidebar" id="adminSidebar">
        <AdminSidebar />
      </aside>

      <main className="admin-main">
        <Outlet />
      </main>
    </div>
  )
}