// Phase 09 My Pets — React port of frontend/pages/mypet.html + frontend/js/mypet.js.
//
// Deltas from the Vanilla page (documented in migration.md Phase 9):
// - Loading/error/empty states replaced Vanilla's static sample pets
//   (Bruno/Luna, stats 2/2/2/1); data always comes from /pets/my.
// - "Healthy Pets" + "Upcoming Appointments" stat cards replaced with
//   Vaccinated / Dogs / Cats (backend has no health or appointment field;
//   Vanilla hardcoded "Good" and 0 appointments).
// - Header bell shows real /notifications (Vanilla rendered fake items).
// - The header sun button toggles the theme (Vanilla left it unwired here).
// - Add/Edit form drops Health/Appointment/custom-species fields (not
//   persistable); save errors render inline instead of alert().
// - Digital Pet ID section in the details modal fetches /pets/:id/qr on open
//   exactly like Vanilla.

import { useEffect, useMemo, useRef, useState } from 'react'
import { getNotifications, type AppNotification } from '../../../api/notifications'
import { deletePet, getMyPets } from '../../../api/pets'
import { useTheme } from '../../../hooks/useTheme'
import { Icon } from '../../../components/shared/Icon'
import { genderIcon, toPetView, type PetView } from './petBase'
import { PetDetailsModal } from './PetDetailsModal'
import { PetFormModal } from './PetFormModal'

type Filter = 'All' | 'Dog' | 'Cat' | 'Bird' | 'Other'

const TABS: { key: Filter; label: string; icon: string }[] = [
  { key: 'All', label: 'All', icon: 'border-all' },
  { key: 'Dog', label: 'Dogs', icon: 'dog' },
  { key: 'Cat', label: 'Cats', icon: 'cat' },
  { key: 'Bird', label: 'Birds', icon: 'bird' },
  { key: 'Other', label: 'Others', icon: 'paw' },
]

interface MenuState {
  pet: PetView
  x: number
  y: number
}

function PetNotificationPanel({ open, notes, onClose }: { open: boolean; notes: AppNotification[] | null; onClose: () => void }) {
  return (
    <div className={`pet-notification-panel${open ? ' show' : ''}`} id="petNotificationPanel">
      <div className="pet-notification-header">
        <strong>Notifications</strong>
        <button type="button" className="pet-notification-close" aria-label="Close notifications" onClick={onClose}>
          &times;
        </button>
      </div>
      {notes === null ? (
        <div className="pet-notification-item">Loading notifications…</div>
      ) : notes.length === 0 ? (
        <div className="pet-notification-item">No notifications yet.</div>
      ) : (
        notes.slice(0, 6).map((n) => (
          <div className="pet-notification-item" key={n._id}>
            <span className="notification-dot" />
            {n.message || n.title}
          </div>
        ))
      )}
    </div>
  )
}

export function MyPetsPage() {
  const { toggle, theme } = useTheme()
  const [pets, setPets] = useState<PetView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('All')
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<PetView | null>(null)
  const [details, setDetails] = useState<PetView | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PetView | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [notes, setNotes] = useState<AppNotification[] | null>(null)
  const [deleting, setDeleting] = useState(false)

  const topSearchRef = useRef<HTMLInputElement>(null)
  const petSearchRef = useRef<HTMLInputElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const loadPets = () => {
    setLoadFailed(false)
    getMyPets()
      .then((res) => {
        setPets((res.pets || []).map(toPetView))
      })
      .catch(() => {
        setPets([])
        setLoadFailed(true)
      })
  }

  const loadNotes = () => {
    getNotifications()
      .then((res) => setNotes(res.notifications || []))
      .catch(() => setNotes([]))
  }

  useEffect(() => {
    loadPets()
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // click-outside closes both the action menu and the notification panel
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as Node
      if (bellRef.current?.contains(t)) return
      if ((e.target as HTMLElement).closest?.('.pet-action-menu')) return
      if (menu) setMenu(null)
      setPanelOpen(false)
    }
    if (menu || panelOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
    return undefined
  }, [menu, panelOpen])

  const onSearch = (value: string, from: 'top' | 'pets') => {
    setQuery(value)
    if (from === 'top' && petSearchRef.current) petSearchRef.current.value = value
    if (from === 'pets' && topSearchRef.current) topSearchRef.current.value = value
  }

  const filtered = useMemo(() => {
    if (!pets) return null
    const q = query.trim().toLowerCase()
    return pets.filter((p) => {
      const matchesFilter = filter === 'All' || p.species === filter
      const matchesSearch = !q || p.name.toLowerCase().includes(q) || p.breed.toLowerCase().includes(q) || p.species.toLowerCase().includes(q)
      return matchesFilter && matchesSearch
    })
  }, [pets, query, filter])

  const stats = useMemo(() => {
    const list = pets || []
    return {
      total: list.length,
      vaccinated: list.filter((p) => p.vaccinated).length,
      dogs: list.filter((p) => p.species === 'Dog').length,
      cats: list.filter((p) => p.species === 'Cat').length,
    }
  }, [pets])

  const unread = (notes || []).filter((n) => !n.isRead).length

  const openCreate = () => {
    setEditing(null)
    setFormOpen(true)
  }

  const openEdit = (pet: PetView) => {
    setEditing(pet)
    setFormOpen(true)
  }

  const openMenu = (e: React.MouseEvent<HTMLButtonElement>, pet: PetView) => {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenu({ pet, x: rect.right, y: rect.bottom })
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deletePet(deleteTarget.id)
      setPets((list) => (list || []).filter((p) => p.id !== deleteTarget.id))
      setDeleteTarget(null)
    } catch (err) {
      alert('Could not delete pet: ' + ((err as Error).message || 'Unknown error'))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="mypet-page">
      <header className="top-header">
        <div className="header-title">
          <h1>
            My Pets <span className="cherry-blossom">🌸</span>
          </h1>
          <p>
            Manage your pets, track their health, and keep all their information organized. <span className="pink-heart">♡</span>
          </p>
        </div>

        <div className="header-right">
          <div className="search-bar">
            <Icon name="search" />
            <input ref={topSearchRef} type="text" placeholder="Search anything..." onChange={(e) => onSearch(e.target.value, 'top')} />
          </div>
          <button className="icon-action-btn" type="button" title="Toggle theme" onClick={toggle}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
          </button>
          <button ref={bellRef} className="icon-action-btn badge-btn" type="button" title="Notifications" onClick={() => setPanelOpen((o) => !o)}>
            <Icon name="bell" />
            <span className="badge">{unread || '0'}</span>
          </button>
          <button className="btn btn-pink" type="button" onClick={openCreate}>
            <Icon name="plus" /> Add New Pet <Icon name="paw" className="icon-small" />
          </button>
        </div>
      </header>

      <PetNotificationPanel open={panelOpen} notes={notes} onClose={() => setPanelOpen(false)} />

      <section className="stats-grid">
        <div className="stat-card pink-card">
          <div className="stat-icon pink-icon">
            <Icon name="paw" />
          </div>
          <div className="stat-info">
            <span className="stat-title">Total Pets</span>
            <span className="stat-value">{stats.total}</span>
            <span className="stat-sub">Pets in your care</span>
          </div>
        </div>

        <div className="stat-card green-card">
          <div className="stat-icon green-icon">
            <Icon name="shield-halved" />
          </div>
          <div className="stat-info">
            <span className="stat-title">Vaccinated</span>
            <span className="stat-value">{stats.vaccinated}</span>
            <span className="stat-sub">
              Up to date{' '}
              <svg className="spark-line green-spark" viewBox="0 0 40 12">
                <path d="M0 8 Q10 12 20 4 T40 6" fill="none" stroke="#2ecc71" strokeWidth="2" />
              </svg>
            </span>
          </div>
        </div>

        <div className="stat-card purple-card">
          <div className="stat-icon purple-icon">
            <Icon name="dog" />
          </div>
          <div className="stat-info">
            <span className="stat-title">Dogs</span>
            <span className="stat-value">{stats.dogs}</span>
            <span className="stat-sub">
              Canine members{' '}
              <svg className="spark-line purple-spark" viewBox="0 0 40 12">
                <path d="M0 8 Q10 12 20 4 T40 6" fill="none" stroke="#9b59b6" strokeWidth="2" />
              </svg>
            </span>
          </div>
        </div>

        <div className="stat-card blue-card">
          <div className="stat-icon blue-icon">
            <Icon name="cat" />
          </div>
          <div className="stat-info">
            <span className="stat-title">Cats</span>
            <span className="stat-value">{stats.cats}</span>
            <span className="stat-sub">
              Feline members{' '}
              <svg className="spark-line blue-spark" viewBox="0 0 40 12">
                <path d="M0 10 Q10 2 20 8 T40 2" fill="none" stroke="#3498db" strokeWidth="2" />
              </svg>
            </span>
          </div>
        </div>
      </section>

      <section className="filter-section">
        <div className="search-pets-input">
          <Icon name="search" />
          <input ref={petSearchRef} type="text" placeholder="Search pets by name, breed..." onChange={(e) => onSearch(e.target.value, 'pets')} />
        </div>

        <div className="filter-tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab-btn${filter === tab.key ? ' active' : ''}`}
              type="button"
              onClick={() => setFilter(tab.key)}
            >
              <Icon name={tab.icon} /> {tab.label}
            </button>
          ))}
        </div>
      </section>

      <section className="pets-grid">
        {pets === null ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20 }}>
            <Icon name="paw" spin style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 15 }} />
            <h3>Loading your pets…</h3>
          </div>
        ) : loadFailed && pets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20 }}>
            <Icon name="triangle-exclamation" style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 15 }} />
            <h3>Could not load your pets</h3>
            <p style={{ color: '#8a96a8', marginTop: 8 }}>Please check your connection and try again.</p>
            <button type="button" className="btn btn-outline-pink" style={{ marginTop: 16 }} onClick={loadPets}>
              <Icon name="rotate" /> Retry
            </button>
          </div>
        ) : pets.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20 }}>
            <Icon name="paw" style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 15 }} />
            <h3>No pets yet</h3>
            <p style={{ color: '#8a96a8', marginTop: 8 }}>
              Add your first pet to get started. <span className="pink-heart">♡</span>
            </p>
            <button type="button" className="btn btn-pink" style={{ marginTop: 16 }} onClick={openCreate}>
              <Icon name="plus" /> Add New Pet
            </button>
          </div>
        ) : filtered && filtered.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '60px 20px', background: '#fff', borderRadius: 20 }}>
            <Icon name="paw" style={{ fontSize: 40, color: '#ff4d6d', marginBottom: 15 }} />
            <h3>No pets found</h3>
            <p style={{ color: '#8a96a8', marginTop: 8 }}>Try another search or filter.</p>
          </div>
        ) : (filtered || []).map((pet) => (
          <div className="pet-card" key={pet.id}>
            <div className="pet-image">
              <img src={pet.image} alt={pet.name} />
            </div>
            <div className="pet-details">
              <div className="pet-header">
                <div>
                  <h3 className="pet-name">
                    {pet.name}{' '}
                    <span className={`gender ${pet.gender === 'Female' ? 'female' : 'male'}`}>
                      <Icon name={genderIcon(pet.gender)} />
                    </span>
                  </h3>
                  <p className="pet-breed">{pet.breed}</p>
                </div>
                <div className="pet-header-right">
                  <button className="more-btn" type="button" title="More options" onClick={(e) => openMenu(e, pet)}>
                    <Icon name="ellipsis-vertical" />
                  </button>
                </div>
              </div>

              <div className="info-list">
                <div className="info-row">
                  <span className="info-label">
                    <Icon name="calendar" /> Age
                  </span>
                  <span className="info-value">{pet.age}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    <Icon name="scale" /> Weight
                  </span>
                  <span className="info-value">{pet.weight}</span>
                </div>
                <div className="info-row">
                  <span className="info-label">
                    <Icon name="syringe" /> Vaccinated
                  </span>
                  <span className={`info-value${pet.vaccinated ? ' status-yes' : ''}`}>{pet.vaccinated ? 'Yes' : 'No'}</span>
                </div>
              </div>

              <div className="card-actions">
                <button className="btn btn-outline-pink view-details-btn" type="button" onClick={() => setDetails(pet)}>
                  <Icon name="eye" /> View Details
                </button>
                <button className="btn btn-icon-blue edit-pet-btn" type="button" title="Edit Pet" onClick={() => openEdit(pet)}>
                  <Icon name="pen" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </section>

      <section className="bottom-grid">
        <div className="add-pet-dashed-card" onClick={openCreate} role="button" tabIndex={0}>
          <div className="plus-icon-circle">
            <Icon name="plus" />
          </div>
          <h4>Add New Pet</h4>
          <p>
            Click here to add a new furry member <span className="pink-heart">♡</span>
          </p>
        </div>
        <div className="tip-card">
          <div className="tip-content">
            <div className="paw-badge">
              <Icon name="paw" />
            </div>
            <div className="tip-text">
              <h4>Pet Care Tip</h4>
              <p>Regular check-ups and a balanced diet keep your pets happy and healthy!</p>
            </div>
          </div>
          <div className="tip-illustration">
            <img src="/assets/images/my-pet/pet-tip.png" alt="Dog tip illustration" />
          </div>
        </div>
      </section>

      {menu && (
        <div className="pet-action-menu" style={{ position: 'fixed', top: menu.y + 8, left: menu.x - 160 }} onClick={() => setMenu(null)}>
          <button type="button" onClick={() => setDetails(menu.pet)}>
            <Icon name="eye" />
            <span>View Details</span>
          </button>
          <button type="button" onClick={() => openEdit(menu.pet)}>
            <Icon name="pen" />
            <span>Edit Pet</span>
          </button>
          <div className="menu-divider" />
          <button type="button" className="delete-action" onClick={() => setDeleteTarget(menu.pet)}>
            <Icon name="trash-can" />
            <span>Delete Pet</span>
          </button>
        </div>
      )}

      {formOpen && (
        <PetFormModal
          editing={editing}
          onClose={() => setFormOpen(false)}
          onSaved={async () => {
            const res = await getMyPets()
            setPets((res.pets || []).map(toPetView))
          }}
        />
      )}

      {details && <PetDetailsModal pet={details} onClose={() => setDetails(null)} />}

      {deleteTarget && (
        <div className="pet-delete-overlay show">
          <div className="pet-delete-modal">
            <div className="delete-icon">
              <Icon name="trash-can" />
            </div>
            <h3>Delete {deleteTarget.name}?</h3>
            <p>
              Are you sure you want to remove <strong>{deleteTarget.name}</strong> from your pets? This action cannot be undone.
            </p>
            <div className="delete-modal-actions">
              <button type="button" className="delete-cancel-btn" onClick={() => setDeleteTarget(null)}>
                Cancel
              </button>
              <button type="button" className="delete-confirm-btn" disabled={deleting} onClick={confirmDelete}>
                <Icon name="trash-can" /> {deleting ? 'Deleting…' : 'Delete Pet'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}