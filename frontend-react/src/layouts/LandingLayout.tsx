import { Outlet } from 'react-router-dom'
import { BackToTop } from '../components/shared/BackToTop'
import { Footer } from '../components/shared/Footer'
import { Navbar } from '../components/shared/Navbar'

// Landing shell — Navbar (header) + rendered sections + Footer + BackToTop,
// mirroring the Vanilla landing page structure (frontend/index.html).

export function LandingLayout() {
  return (
    <>
      <Navbar />
      <Outlet />
      <Footer />
      <BackToTop />
    </>
  )
}