import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Icon } from '../components/shared/Icon'

// Parity with sidebar.js: the off-canvas state lives on `body.sidebar-open`;
// the toggle + overlay are rendered here (Vanilla appends them to <body>). The
// menu/x glyphs are stateful bundled icons — Instant CRUD via props.

export function AppLayout() {
  const [open, setOpen] = useState(false)

  const applyOpen = (next: boolean) => {
    setOpen(next)
    document.body.classList.toggle('sidebar-open', next)
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
        <Icon name={open ? 'x' : 'menu'} />
      </button>

      <div className="mobile-sidebar-overlay" aria-hidden="true" onClick={() => applyOpen(false)} />
    </>
  )
}