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
import { HealthPage } from '../pages/app/health/HealthPage'
import { AppointmentsPage } from '../pages/app/appointments/AppointmentsPage'
import { CommunityPage } from '../pages/app/community/CommunityPage'
import { MyPetsPage } from '../pages/app/mypet/MyPetsPage'
import { PetIdPage } from '../pages/app/petid/PetIdPage'
import { RemindersPage } from '../pages/app/reminders/RemindersPage'
import { LostFoundPage } from '../pages/app/lostFound/LostFoundPage'
import { AdoptionPage } from '../pages/app/adoption/AdoptionPage'
import { BreedsPage } from '../pages/app/breeds/BreedsPage'
import { BreedDetailsPage } from '../pages/app/breedDetails/BreedDetailsPage'
import { SettingsPage } from '../pages/app/settings/SettingsPage'
import { PetGPTPage } from '../pages/app/petgpt/PetGPTPage'
import { RedirectIfAuthed, RequireAdmin, RequireAuth } from './guards'
import { AdminDashboardPage } from '../pages/admin/AdminDashboardPage'
import { AdminUsersPage } from '../pages/admin/AdminUsersPage'
import { AdminPetsPage } from '../pages/admin/AdminPetsPage'
import { AdminAdoptionsPage } from '../pages/admin/AdminAdoptionsPage'
import { AdminCommunityPage } from '../pages/admin/AdminCommunityPage'
import { AdminLostFoundPage } from '../pages/admin/AdminLostFoundPage'

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
      { path: 'adoption', element: <AdoptionPage /> },
      { path: 'health', element: <HealthPage /> },
      { path: 'appointments', element: <AppointmentsPage /> },
      { path: 'reminders', element: <RemindersPage /> },
      { path: 'community', element: <CommunityPage /> },
      { path: 'lost-found', element: <LostFoundPage /> },
      { path: 'petgpt', element: <PetGPTPage /> },
      { path: 'breeds', element: <BreedsPage /> },
      { path: 'breeds/:id', element: <BreedDetailsPage /> },
      { path: 'pet-id', element: <PetIdPage /> },
      { path: 'settings', element: <SettingsPage /> },
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
      { index: true, element: <AdminDashboardPage /> },
      { path: 'users', element: <AdminUsersPage /> },
      { path: 'pets', element: <AdminPetsPage /> },
      { path: 'adoptions', element: <AdminAdoptionsPage /> },
      { path: 'community', element: <AdminCommunityPage /> },
      { path: 'lost-found', element: <AdminLostFoundPage /> },
    ],
  },

  // ── 404 ────────────────────────────────────────────────────
  { path: '*', element: <NotFound /> },
]