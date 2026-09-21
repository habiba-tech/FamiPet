import { Navigate, type RouteObject } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { LandingLayout } from '../layouts/LandingLayout'
import { PageStub } from '../pages/_stub/PageStub'
import { NotFound } from '../pages/NotFound'
import { RequireAdmin, RequireAuth } from './guards'

// Route table follows migration.md §4 (Page Organization) — a 1:1 mirror of
// the Vanilla page inventory. Stub pages are swapped for real page components
// in each feature phase. Order: landing → auth → app → admin → catch-all.

export const routes: RouteObject[] = [
  // ── Landing ────────────────────────────────────────────────
  {
    element: <LandingLayout />,
    children: [{ index: true, element: <PageStub title="Home" /> }],
  },

  // ── Auth (includes email deep links) ───────────────────────
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <PageStub title="Login" /> },
      { path: '/signup', element: <PageStub title="Sign Up" /> },
      { path: '/forgot-password', element: <PageStub title="Forgot Password" /> },
      { path: '/reset-password/:token', element: <PageStub title="Reset Password" /> },
      { path: '/verify-email/:token', element: <PageStub title="Verify Email" /> },
    ],
  },

  // ── App shell (sidebar pages) ──────────────────────────────
  {
    path: '/app',
    element: (
      <RequireAuth>
        <AppLayout />
      </RequireAuth>
    ),
    children: [
      { index: true, element: <Navigate to="/app/dashboard" replace /> },
      { path: 'dashboard', element: <PageStub title="Dashboard" /> },
      { path: 'mypet', element: <PageStub title="My Pets" /> },
      { path: 'adoption', element: <PageStub title="Adoption" /> },
      { path: 'health', element: <PageStub title="Health" /> },
      { path: 'appointments', element: <PageStub title="Appointments" /> },
      { path: 'reminders', element: <PageStub title="Reminders" /> },
      { path: 'community', element: <PageStub title="Community" /> },
      { path: 'lost-found', element: <PageStub title="Lost & Found" /> },
      { path: 'petgpt', element: <PageStub title="PetGPT" /> },
      { path: 'breeds', element: <PageStub title="Pet Breeds" /> },
      { path: 'breeds/:id', element: <PageStub title="Breed Details" /> },
      { path: 'pet-id', element: <PageStub title="Pet ID" /> },
      { path: 'settings', element: <PageStub title="Settings" /> },
    ],
  },

  // ── Admin shell (sidebar section, admin-only) ──────────────
  {
    path: '/app/admin',
    element: (
      <RequireAdmin>
        <AdminLayout />
      </RequireAdmin>
    ),
    children: [
      { index: true, element: <PageStub title="Admin Dashboard" /> },
      { path: 'users', element: <PageStub title="Admin Users" /> },
      { path: 'pets', element: <PageStub title="Admin Pets" /> },
      { path: 'adoptions', element: <PageStub title="Admin Adoptions" /> },
      { path: 'community', element: <PageStub title="Admin Community" /> },
      { path: 'lost-found', element: <PageStub title="Admin Lost & Found" /> },
    ],
  },

  // ── 404 ────────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },
]