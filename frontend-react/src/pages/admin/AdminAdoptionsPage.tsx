// Admin Adoptions — parity with frontend/admin/adoptions.html +
// js/admin-adoptions.js: review every adoption request (`GET /adoptions`) and
// approve/reject pending ones (`PUT /adoptions/:id {status}`). The backend
// enforces `adminOnly`; approving also marks the pet adopted server-side.

import { useEffect, useState } from 'react'
import { getAllAdoptions, updateAdoptionStatus, type Adoption } from '../../api/adoptions'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

export function AdminAdoptionsPage() {
  const [adoptions, setAdoptions] = useState<Adoption[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = () => {
    setError('')
    getAllAdoptions()
      .then((res) => setAdoptions(res.adoptions || []))
      .catch((err) => {
        setAdoptions([])
        setError((err instanceof Error && err.message) || 'Could not load requests.')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  const setStatus = async (a: Adoption, status: 'Approved' | 'Rejected') => {
    if (!window.confirm(`${status} this adoption request?`)) return
    try {
      const res = await updateAdoptionStatus(a._id, status)
      setIsError(false)
      setMessage(res.message || `Request ${status.toLowerCase()}.`)
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not update the request.')
    }
  }

  const statusPill = (s?: string) => {
    if (s === 'Approved') return ['pill green', 'Approved'] as const
    if (s === 'Rejected') return ['pill red', 'Rejected'] as const
    return ['pill amber', 'Pending'] as const
  }

  return (
    <>
      <AdminTopbar title="Adoption Requests" subtitle="Review and approve/reject adoption applications." />

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Applicant</th>
                <th>Contact</th>
                <th>Reason</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {adoptions === null && !error ? (
                <tr>
                  <td colSpan={6} className="admin-loading">
                    Loading requests...
                  </td>
                </tr>
              ) : error ? (
                <AdminTableEmpty icon="triangle-exclamation" message={error} colSpan={6} />
              ) : !(adoptions || []).length ? (
                <AdminTableEmpty icon="heart" message="No adoption requests yet." colSpan={6} />
              ) : (
                (adoptions || []).map((a) => {
                  const [cls, label] = statusPill(a.status)
                  const pending = String(a.status) === 'Pending'
                  const applicantUser = a.user && typeof a.user === 'object' ? a.user.name : ''
                  return (
                    <tr key={a._id}>
                      <td>
                        <strong>{(a.pet && a.pet.name) || 'Unknown Pet'}</strong>
                      </td>
                      <td>
                        <strong>{a.fullName}</strong>
                        <div className="admin-muted">{applicantUser}</div>
                      </td>
                      <td>
                        <div>{a.phone || '—'}</div>
                        <div className="admin-muted">
                          {a.user && typeof a.user === 'object' ? a.user.email || '' : ''}
                        </div>
                      </td>
                      <td className="admin-reason">{a.reasonForAdoption}</td>
                      <td>
                        <span className={cls}>{label}</span>
                      </td>
                      <td>
                        {pending ? (
                          <>
                            <button
                              type="button"
                              className="admin-btn-sm btn-approve"
                              onClick={() => void setStatus(a, 'Approved')}
                            >
                              Approve
                            </button>{' '}
                            <button
                              type="button"
                              className="admin-btn-sm btn-reject"
                              onClick={() => void setStatus(a, 'Rejected')}
                            >
                              Reject
                            </button>
                          </>
                        ) : (
                          <span className="admin-muted">Reviewed</span>
                        )}
                      </td>
                    </tr>
                  )
                })
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