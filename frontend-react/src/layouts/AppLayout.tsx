import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

// Parity with sidebar.js: the off-canvas state lives on `body.sidebar-open`;
// the toggle + overlay are rendered here (Vanilla appends them to <body>) and
// the lucide menu/x icons re-render after each swap. Clicking a sidebar link
// closes the drawer (sidebar.js wires that on every `.ann-nav-item`).

export function AppLayout() {
  const [open, setOpen] = useState(false)

  const applyOpen = (next: boolean) => {
    setOpen(next)
    document.body.classList.toggle('sidebar-open', next)
    window.lucide?.createIcons()
  }

  return (
    <>
      <div className="app">
        <div id="sidebar-container">
          <Sidebar onNavigate={() => applyOpen(false)} />
        </div>

        <main className="main-content">
          <Outlet />
        </main>
      </div>

      <button
        type="button"
        className="mobile-sidebar-toggle"
        aria-label={open ? 'Close navigation' : 'Open navigation'}
        onClick={() => applyOpen(!open)}
      >
        <i data-lucide={open ? 'x' : 'menu'} />
      </button>

      <div className="mobile-sidebar-overlay" aria-hidden="true" onClick={() => applyOpen(false)} />
    </>
  )
}