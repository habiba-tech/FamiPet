import { Navigate, type RouteObject } from 'react-router-dom'
import { AdminLayout } from '../layouts/AdminLayout'
import { AppLayout } from '../layouts/AppLayout'
import { AuthLayout } from '../layouts/AuthLayout'
import { LandingLayout } from '../layouts/LandingLayout'
import { ForgotPasswordPage } from '../pages/auth/ForgotPasswordPage'
import { LoginPage } from '../pages/auth/LoginPage'
import { ResetPasswordPage } from '../pages/auth/ResetPasswordPage'
import { SignupPage } from '../pages/auth/SignupPage'
import { VerifyEmailPage } from '../pages/auth/VerifyEmailPage'
import { PageStub } from '../pages/_stub/PageStub'
import { NotFound } from '../pages/NotFound'
import { DashboardPage } from '../pages/app/dashboard/DashboardPage'
import { MyPetsPage } from '../pages/app/mypet/MyPetsPage'
import { PetIdPage } from '../pages/app/petid/PetIdPage'
import { RedirectIfAuthed, RequireAdmin, RequireAuth } from './guards'

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
    element: (
      <RedirectIfAuthed>
        <AuthLayout />
      </RedirectIfAuthed>
    ),
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
      { path: '/reset-password/:token', element: <ResetPasswordPage /> },
      { path: '/verify-email/:token', element: <VerifyEmailPage /> },
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
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'mypet', element: <MyPetsPage /> },
      { path: 'adoption', element: <PageStub title="Adoption" /> },
      { path: 'health', element: <PageStub title="Health" /> },
      { path: 'appointments', element: <PageStub title="Appointments" /> },
      { path: 'reminders', element: <PageStub title="Reminders" /> },
      { path: 'community', element: <PageStub title="Community" /> },
      { path: 'lost-found', element: <PageStub title="Lost & Found" /> },
      { path: 'petgpt', element: <PageStub title="PetGPT" /> },
      { path: 'breeds', element: <PageStub title="Pet Breeds" /> },
      { path: 'breeds/:id', element: <PageStub title="Breed Details" /> },
      { path: 'pet-id', element: <PetIdPage /> },
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