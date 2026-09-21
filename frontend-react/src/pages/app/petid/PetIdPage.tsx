// Phase 09 Pet ID — React port of frontend/pages/pet-id.html + frontend/js/pet-id.js.
//
// Deltas from Vanilla (documented in migration.md Phase 9):
// - The preview now renders an `<img>` (Vanilla referenced
//   `petPreview.querySelector("img")` but the markup had none, so it threw on
//   every pet selection — the React port matches the CSS that targets it).
// - "No pets yet" empty state links to /app/mypet (Vanilla: mypet.html).
// - Header runs the real /notifications panel and a working theme toggle.

import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { getMe } from '../../../api/auth'
import { getNotifications, type AppNotification } from '../../../api/notifications'
import { getMyPets, getPetQr } from '../../../api/pets'
import { useTheme } from '../../../hooks/useTheme'
import { Icon } from '../../../components/shared/Icon'
import { capFirst, speciesImage, toPetView, type PetView } from '../mypet/petBase'

export function PetIdPage() {
  const { toggle, theme } = useTheme()
  const [pets, setPets] = useState<PetView[] | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [currentPet, setCurrentPet] = useState<PetView | null>(null)
  const [qr, setQr] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [notes, setNotes] = useState<AppNotification[] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)

  const idCardRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    getMe()
      .then((res) => setOwnerName(res.user?.name || ''))
      .catch(() => setOwnerName(''))
    getMyPets()
      .then((res) => setPets((res.pets || []).map(toPetView)))
      .catch(() => setPets([]))
    getNotifications()
      .then((res) => setNotes(res.notifications || []))
      .catch(() => setNotes([]))
  }, [])

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bellRef.current?.contains(e.target as Node)) return
      setPanelOpen(false)
    }
    if (panelOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
    return undefined
  }, [panelOpen])

  const unread = (notes || []).filter((n) => !n.isRead).length

  const onSelect = (id: string) => {
    const pet = (pets || []).find((p) => p.id === id) || null
    setCurrentPet(pet)
    setQr(null)
  }

  const generateQr = async () => {
    if (!currentPet) return
    setGenerating(true)
    try {
      const res = await getPetQr(currentPet.id)
      if (res.qrCode) setQr(res.qrCode)
      else alert('Could not generate the QR code. Please try again.')
    } catch (err) {
      alert((err as Error).message || 'Could not generate the QR code. Please try again.')
    } finally {
      setGenerating(false)
    }
  }

  const downloadIdCard = () => {
    const card = idCardRef.current
    if (!card) return
    const name = (currentPet?.name || 'pet').replace(/\s+/g, '-').toLowerCase()
    try {
      const clone = card.cloneNode(true) as HTMLElement
      const canvas = document.createElement('canvas')
      const width = card.offsetWidth || 460
      const height = card.offsetHeight || 420
      canvas.width = width * 2
      canvas.height = height * 2
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('no ctx')
      const xml = new XMLSerializer().serializeToString(clone)
      const svg =
        'data:image/svg+xml;charset=utf-8,' +
        encodeURIComponent(
          `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${xml}</foreignObject></svg>`,
        )
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const link = document.createElement('a')
        link.download = `famipet-${name}-id.png`
        link.href = canvas.toDataURL('image/png')
        link.click()
      }
      img.src = svg
    } catch (error) {
      console.warn(error)
      window.print()
    }
  }

  if (pets !== null && pets.length === 0) {
    return (
      <div className="mypet-page petid-page">
        <header className="top-header">
          <div className="header-title">
            <h1>
              Digital Pet ID <span className="cherry-blossom">🌸</span>
            </h1>
            <p>
              Generate a QR code and digital ID card for your pets. <span className="pink-heart">♡</span>
            </p>
          </div>
        </header>
        <section className="dashboard-card" id="petIdSection">
          <div className="petid-empty" style={{ marginTop: 0 }}>
            <Icon name="paw" />
            <h3>No pets yet</h3>
            <p style={{ marginTop: 8 }}>
              Add a pet first to generate its Digital ID.{' '}
              <Link to="/app/mypet" style={{ color: '#ff5c8a', fontWeight: 600 }}>
                Add your first pet →
              </Link>
            </p>
          </div>
        </section>
      </div>
    )
  }

  const previewPet = currentPet
  const photo = previewPet ? previewPet.image || speciesImage(previewPet.species) : ''

  return (
    <div className="mypet-page petid-page">
      <header className="top-header">
        <div className="header-title">
          <h1>
            Digital Pet ID <span className="cherry-blossom">🌸</span>
          </h1>
          <p>
            Generate a QR code and digital ID card for your pets. <span className="pink-heart">♡</span>
          </p>
        </div>

        <div className="header-right">
          <button className="icon-action-btn" type="button" title="Toggle theme" onClick={toggle}>
            <Icon name={theme === 'dark' ? 'moon' : 'sun'} />
          </button>
          <button ref={bellRef} className="icon-action-btn badge-btn" type="button" title="Notifications" onClick={() => setPanelOpen((o) => !o)}>
            <Icon name="bell" />
            <span className="badge-count">{unread || '0'}</span>
          </button>
        </div>
      </header>

      <div className={`pet-notification-panel${panelOpen ? ' show' : ''}`} id="petNotificationPanel">
        <div className="pet-notification-header">
          <strong>Notifications</strong>
          <button type="button" className="pet-notification-close" aria-label="Close notifications" onClick={() => setPanelOpen(false)}>
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

      <section className="dashboard-card" id="petIdSection">
        <div className="petid-layout">
          <div className="petid-panel">
            <h3>
              <Icon name="qrcode" style={{ color: '#ff5c8a', marginRight: '0.4rem' }} />Select Your Pet
            </h3>
            <div className="petid-select-wrap">
              <label htmlFor="petSelect">Pet</label>
              <select id="petSelect" value={currentPet?.id || ''} onChange={(e) => onSelect(e.target.value)}>
                {pets === null ? (
                  <option value="">Loading pets...</option>
                ) : (
                  <>
                    <option value="">Choose a pet...</option>
                    {pets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({capFirst(p.species)})
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {previewPet && (
              <div className="petid-preview" style={{ display: 'flex' }}>
                <img src={photo} alt={previewPet.name} />
                <div>
                  <h4>{previewPet.name}</h4>
                  <p>
                    {previewPet.breed ? `${capFirst(previewPet.species)} • ${previewPet.breed}` : capFirst(previewPet.species)}
                  </p>
                </div>
              </div>
            )}

            <button className="btn-pink" id="generateQrBtn" type="button" disabled={!currentPet || generating} onClick={generateQr}>
              <Icon name={generating ? 'circle-notch' : 'bolt'} spin={generating} /> {generating ? 'Generating...' : 'Generate QR Code'}
            </button>

            {qr && (
              <button className="btn-pink" id="downloadIdBtn" type="button" style={{ background: '#1e293b' }} onClick={downloadIdCard}>
                <Icon name="download" /> Download ID Card
              </button>
            )}
          </div>

          <div className="petid-panel">
            <h3>
              <Icon name="id-card" style={{ color: '#ff5c8a', marginRight: '0.4rem' }} />Pet ID Card
            </h3>

            {!qr ? (
              <div id="idPlaceholder" className="petid-empty">
                <Icon name="id-card" />
                <h3>No ID generated yet</h3>
                <p style={{ marginTop: 8 }}>Choose a pet and click &quot;Generate QR Code&quot;.</p>
              </div>
            ) : (
              <div className="id-card" id="idCard" ref={idCardRef}>
                <div className="id-card-head">
                  <h3>FAMIPET DIGITAL ID</h3>
                  <div className="brand-logo">
                    <img src="/assets/images/dashboard/cute-pet.svg" alt="Famipet" style={{ width: 26, height: 26 }} />
                  </div>
                </div>
                <div className="id-card-body">
                  <img className="id-card-photo" src={photo} alt="Pet" />
                  <div className="id-card-info">
                    {/* Human-readable, label/value presentation of the real
                        pet data (Vanilla rendered a raw object/JSON here —
                        Phase 09 polish). Pet ID is the backend petUid, falling
                        back to the real short database id for legacy pets. */}
                    <div className="id-row">
                      <span>Pet ID</span>
                      <strong>{currentPet?.petUid || (currentPet ? currentPet.id.slice(-8).toUpperCase() : '—')}</strong>
                      <span>Pet Name</span>
                      <strong>{currentPet?.name}</strong>
                      <span>Species</span>
                      <strong>{capFirst(currentPet?.species)}</strong>
                      <span>Breed</span>
                      <strong>{currentPet?.breed || '—'}</strong>
                      <span>Owner</span>
                      <strong>{ownerName || 'Pet Parent'}</strong>
                    </div>
                  </div>
                </div>
                <div className="id-card-qr">
                  <img id="idQr" src={qr} alt="Pet ID QR Code" />
                  <small>Scan to view this pet's digital ID</small>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  )
}