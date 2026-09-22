// Admin Dashboard — parity with frontend/admin/dashboard.html +
// js/admin-dashboard.js: six real `/admin/dashboard` stat cards + a recent
// users table from `/admin/users/recent`. All data is backend-real (AGENTS §5).

import { useEffect, useState } from 'react'
import {
  getDashboardStats,
  getRecentUsers,
  type AdminDashboardStats,
  type AdminUser,
  type AdminUsersResponse,
} from '../../api/admin'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

const STAT_CONFIG = [
  { key: 'totalUsers', label: 'Total Users', icon: 'users', color: 'pink' },
  { key: 'totalPets', label: 'Total Pets', icon: 'paw', color: 'green' },
  { key: 'availablePets', label: 'Available Pets', icon: 'heart', color: 'lavender' },
  { key: 'adoptedPets', label: 'Adopted Pets', icon: 'house', color: 'cyan' },
  { key: 'pendingAdoptions', label: 'Pending Adoptions', icon: 'note-sticky', color: 'amber' },
  { key: 'lostFoundReports', label: 'Lost & Found', icon: 'magnifying-glass', color: 'pink' },
] as const

function statusPill(u: AdminUser): string {
  if (u.isBlocked) return "pill red"
  return u.isVerified ? 'pill green' : 'pill amber'
}

function statusLabel(u: AdminUser): string {
  if (u.isBlocked) return 'Blocked'
  return u.isVerified ? 'Verified' : 'Unverified'
}

export function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null)
  const [statsError, setStatsError] = useState('')
  const [recent, setRecent] = useState<AdminUsersResponse | null>(null)
  const [recentError, setRecentError] = useState('')

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    getDashboardStats()
      .then((res) => setStats(res.stats))
      .catch((err) => setStatsError((err instanceof Error && err.message) || 'Unknown error'))
    getRecentUsers()
      .then((res) => setRecent(res))
      .catch(() => setRecentError('Could not load recent users.'))
  }, [])

  return (
    <>
      <AdminTopbar title="Admin Dashboard" subtitle="Overview of your Famipet platform." />

      <section className="stats-grid">
        {!statsError && !stats ? (
          <div className="admin-loading admin-card">Loading statistics...</div>
        ) : statsError ? (
          <div className="admin-empty admin-card">
            <i>
              <Icon name="triangle-exclamation" />
            </i>
            <p>Could not load statistics: {statsError}</p>
          </div>
        ) : (
          STAT_CONFIG.map((item) => (
            <div className="stat-card" key={item.key}>
              <div className={`stat-icon ${item.color}`}>
                <Icon name={item.icon} />
              </div>
              <div>
                <h4>{item.label}</h4>
                <div className="stat-val">{Number(stats?.[item.key] ?? 0).toLocaleString()}</div>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="admin-card recent-card">
        <h4 className="admin-section-title">
          <i>
            <Icon name="clock-rotate-left" />
          </i>
          Recent Users
        </h4>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {!recentError && !recent ? (
                <tr>
                  <td colSpan={4} className="admin-loading">
                    Loading...
                  </td>
                </tr>
              ) : recentError ? (
                <AdminTableEmpty icon="triangle-exclamation" message={recentError} colSpan={4} />
              ) : !recent?.users?.length ? (
                <AdminTableEmpty icon="users" message="No users registered yet." colSpan={4} />
              ) : (
                (recent?.users || []).map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className={`pill ${u.role === 'admin' ? 'lavender' : 'green'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={statusPill(u)}>{statusLabel(u)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  )
}