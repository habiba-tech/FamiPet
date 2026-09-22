// Admin Users — parity with frontend/admin/users.html + js/admin-users.js:
// block/unblock and delete non-admin accounts (`PUT /admin/users/:id/block`,
// `DELETE /admin/users/:id`). Admin accounts show "Protected" (Vanilla parity);
// the backend `adminOnly` guard rejects non-admin callers.

import { useEffect, useState } from 'react'
import { deleteUser, getAllUsers, toggleUserBlock, type AdminUser } from '../../api/admin'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

export function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = () => {
    setError('')
    getAllUsers()
      .then((res) => setUsers(res.users || []))
      .catch((err) => {
        setUsers([])
        setError((err instanceof Error && err.message) || 'Could not load users.')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  const showToast = (text: string, failed = false) => {
    setIsError(failed)
    setMessage(text)
  }

  const toggleBlock = async (u: AdminUser) => {
    try {
      const res = await toggleUserBlock(u._id)
      showToast(res.message || 'User status updated.')
      load()
    } catch (err) {
      showToast((err instanceof Error && err.message) || 'Could not update user.', true)
    }
  }

  const confirmDelete = async (u: AdminUser) => {
    if (!window.confirm('Delete this user account? This cannot be undone.')) return
    try {
      await deleteUser(u._id)
      showToast('User deleted.')
      load()
    } catch (err) {
      showToast((err instanceof Error && err.message) || 'Could not delete user.', true)
    }
  }

  const statusPill = (u: AdminUser) =>
    u.isBlocked ? 'pill red' : u.isVerified ? 'pill green' : 'pill amber'
  const statusLabel = (u: AdminUser) => (u.isBlocked ? 'Blocked' : u.isVerified ? 'Verified' : 'Unverified')

  return (
    <>
      <AdminTopbar title="Manage Users" subtitle="Block, unblock or remove user accounts." />

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users === null && !error ? (
                <tr>
                  <td colSpan={6} className="admin-loading">
                    Loading users...
                  </td>
                </tr>
              ) : error ? (
                <AdminTableEmpty icon="triangle-exclamation" message={error} colSpan={6} />
              ) : !(users || []).length ? (
                <AdminTableEmpty icon="users" message="No users registered yet." colSpan={6} />
              ) : (
                (users || []).map((u) => (
                  <tr key={u._id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td>{u.email}</td>
                    <td>{u.phone || '—'}</td>
                    <td>
                      <span className={`pill ${u.role === 'admin' ? 'lavender' : 'green'}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={statusPill(u)}>{statusLabel(u)}</span>
                    </td>
                    <td>
                      {u.role !== 'admin' ? (
                        <>
                          <button
                            type="button"
                            className="admin-btn-sm btn-block"
                            onClick={() => void toggleBlock(u)}
                          >
                            {u.isBlocked ? 'Unblock' : 'Block'}
                          </button>{' '}
                          <button
                            type="button"
                            className="admin-btn-sm btn-danger"
                            onClick={() => void confirmDelete(u)}
                          >
                            Delete
                          </button>
                        </>
                      ) : (
                        <span className="admin-protected">Protected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message && (
        <div className={`admin-toast${isError ? ' error' : ''}`}>
          <i>
            <Icon name={isError ? 'triangle-exclamation' : 'circle-check'} />
          </i>
          <span>{message}</span>
        </div>
      )}
    </>
  )
}