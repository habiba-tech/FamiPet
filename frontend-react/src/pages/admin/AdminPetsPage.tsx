// Admin Pets — parity with frontend/admin/pets.html + js/admin-pets.js:
// list all platform pets (`GET /admin/pets`, owner + breed populated by the
// backend) and delete listings via `DELETE /admin/pets/:id`.

import { useEffect, useState } from 'react'
import { deletePet, getAllPets, type AdminPet } from '../../api/admin'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

export function AdminPetsPage() {
  const [pets, setPets] = useState<AdminPet[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = () => {
    setError('')
    getAllPets()
      .then((res) => setPets(res.pets || []))
      .catch((err) => {
        setPets([])
        setError((err instanceof Error && err.message) || 'Could not load pets.')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  const confirmDelete = async (p: AdminPet) => {
    if (!window.confirm('Delete this pet listing? This cannot be undone.')) return
    try {
      await deletePet(p.id)
      setIsError(false)
      setMessage('Pet deleted.')
      setError('')
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not delete pet.')
    }
  }

  const statusPill = (p: AdminPet) => {
    if (p.adopted) return ['pill green', 'Adopted'] as const
    if (p.status === 'available') return ['pill lavender', 'Available'] as const
    if (p.status === 'lost') return ['pill red', 'Lost'] as const
    if (p.status === 'inactive') return ['pill gray', 'Inactive'] as const
    return ['pill amber', p.status || '—'] as const
  }

  const speciesLabel = (s?: string) =>
    s ? s.replace(/^\w/, (c) => c.toUpperCase()) : ''

  return (
    <>
      <AdminTopbar title="Manage Pets" subtitle="View and remove pet listings across the platform." />

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Pet</th>
                <th>Species</th>
                <th>Breed</th>
                <th>Age</th>
                <th>Status</th>
                <th>Owner</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pets === null && !error ? (
                <tr>
                  <td colSpan={7} className="admin-loading">
                    Loading pets...
                  </td>
                </tr>
              ) : error ? (
                <AdminTableEmpty icon="triangle-exclamation" message={error} colSpan={7} />
              ) : !(pets || []).length ? (
                <AdminTableEmpty icon="paw" message="No pets added yet." colSpan={7} />
              ) : (
                (pets || []).map((p) => {
                  const [cls, label] = statusPill(p)
                  return (
                    <tr key={p.id}>
                      <td>
                        <strong>{p.name}</strong>
                      </td>
                      <td>
                        <span className="pill gray">{speciesLabel(p.species)}</span>
                      </td>
                      <td>{p.breed || '—'}</td>
                      <td>{p.age !== undefined && p.age !== null ? String(p.age) : '—'}</td>
                      <td>
                        <span className={cls}>{label}</span>
                      </td>
                      <td>
                        {p.owner ? (
                          <>
                            <strong>{p.owner.name}</strong>
                            <br />
                            <span className="admin-muted">{p.owner.email || ''}</span>
                          </>
                        ) : (
                          <span className="admin-muted">—</span>
                        )}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-btn-sm btn-danger"
                          onClick={() => void confirmDelete(p)}
                        >
                          Delete
                        </button>
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