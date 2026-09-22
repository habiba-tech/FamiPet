// Admin Lost & Found — parity with frontend/admin/lost-found.html +
// js/admin-lost-found.js: moderate lost/found reports (`GET /admin/lost-found`),
// resolve/reopen (`PUT /admin/lost-found/:id/status`) and delete
// (`DELETE /admin/lost-found/:id`). All admin-only on the backend.

import { useEffect, useState } from 'react'
import {
  deleteLostFoundReport,
  getAllLostFoundReports,
  updateLostFoundStatus,
  type AdminLostFoundReport,
} from '../../api/admin'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

export function AdminLostFoundPage() {
  const [reports, setReports] = useState<AdminLostFoundReport[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = () => {
    setError('')
    getAllLostFoundReports()
      .then((res) => setReports(res.reports || []))
      .catch((err) => {
        setReports([])
        setError((err instanceof Error && err.message) || 'Could not load reports.')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  const setStatus = async (r: AdminLostFoundReport, status: 'active' | 'resolved') => {
    if (!window.confirm(`Mark this report as ${status}?`)) return
    try {
      const res = await updateLostFoundStatus(r._id, status)
      setIsError(false)
      setMessage(res.message || `Report marked ${status}.`)
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not update the report.')
    }
  }

  const confirmDelete = async (r: AdminLostFoundReport) => {
    if (!window.confirm('Delete this report permanently?')) return
    try {
      await deleteLostFoundReport(r._id)
      setIsError(false)
      setMessage('Report deleted.')
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not delete the report.')
    }
  }

  const speciesLabel = (s?: string) => (s ? s.replace(/^\w/, (c) => c.toUpperCase()) : 'other')

  const resolved = (r: AdminLostFoundReport) => String(r.status) === 'resolved'

  return (
    <>
      <AdminTopbar title="Lost & Found Reports" subtitle="Resolve, reopen and remove lost & found reports." />

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Type</th>
                <th>Pet</th>
                <th>Contact</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports === null && !error ? (
                <tr>
                  <td colSpan={6} className="admin-loading">
                    Loading reports...
                  </td>
                </tr>
              ) : error ? (
                <AdminTableEmpty icon="triangle-exclamation" message={error} colSpan={6} />
              ) : !(reports || []).length ? (
                <AdminTableEmpty icon="magnifying-glass" message="No lost &amp; found reports yet." colSpan={6} />
              ) : (
                (reports || []).map((r) => (
                  <tr key={r._id}>
                    <td>
                      <span className={`pill ${r.type === 'found' ? 'lavender' : 'red'}`}>
                        {r.type === 'found' ? 'Found' : 'Lost'}
                      </span>
                    </td>
                    <td>
                      <strong>{r.petName}</strong>
                      <div className="admin-muted">
                        {speciesLabel(r.species)}
                        {r.breed ? ` • ${r.breed}` : ''}
                      </div>
                    </td>
                    <td>
                      <div>{r.contactName || '—'}</div>
                      <div className="admin-muted">{r.contactPhone || ''}</div>
                    </td>
                    <td>
                      <div>{r.location || '—'}</div>
                      <div className="admin-muted">{r.description || ''}</div>
                    </td>
                    <td>
                      <span className={`pill ${resolved(r) ? 'green' : 'amber'}`}>
                        {resolved(r) ? 'Resolved' : 'Active'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-btn-sm ${resolved(r) ? 'btn-unblock' : 'btn-approve'}`}
                        onClick={() => void setStatus(r, resolved(r) ? 'active' : 'resolved')}
                      >
                        {resolved(r) ? 'Reopen' : 'Resolve'}
                      </button>{' '}
                      <button
                        type="button"
                        className="admin-btn-sm btn-danger"
                        onClick={() => void confirmDelete(r)}
                      >
                        Delete
                      </button>
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