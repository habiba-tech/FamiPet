// React port of VIEW PET DETAILS in frontend/js/mypet.js (viewPetDetails).
// Deltas from Vanilla (documented in migration.md Phase 9):
// - Health pill and "Upcoming Appointment" section dropped (backend has no
//   fields for either; Vanilla rendered hardcoded "Good" / always-empty).

import { useEffect, useRef, useState } from 'react'
import { getPetQr } from '../../../api/pets'
import { Icon } from '../../../components/shared/Icon'
import { genderIcon, type PetView } from './petBase'

interface Props {
  pet: PetView
  onClose: () => void
}

export function PetDetailsModal({ pet, onClose }: Props) {
  const [qr, setQr] = useState(pet.qrCode || null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let alive = true
    if (!pet.qrCode) {
      getPetQr(pet.id)
        .then((res) => {
          if (alive && res.qrCode) setQr(res.qrCode)
        })
        .catch(() => {
          /* keep placeholder */
        })
    }
    return () => {
      alive = false
    }
  }, [pet.id, pet.qrCode])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayRef.current) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="pet-details-overlay show" ref={overlayRef}>
      <div className="pet-details-modal">
        <div className="pet-details-header">
          <div className="pet-details-title">
            <div className="pet-details-icon">
              <Icon name="paw" />
            </div>
            <div>
              <h2>Pet Details</h2>
              <p>Complete information about your pet</p>
            </div>
          </div>
          <button type="button" className="pet-details-close" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="pet-details-profile">
          <div className="pet-details-image">
            <img src={pet.image} alt={pet.name} />
          </div>
          <div className="pet-details-name">
            <h3>
              {pet.name} <span className={`gender ${pet.gender === 'Female' ? 'female' : 'male'}`}><Icon name={genderIcon(pet.gender)} /></span>
            </h3>
            <p>{pet.breed}</p>
          </div>
        </div>

        <div className="pet-details-grid">
          <div className="detail-box">
            <div className="detail-label">
              <Icon name="calendar" /> Age
            </div>
            <strong>{pet.age}</strong>
          </div>
          <div className="detail-box">
            <div className="detail-label">
              <Icon name="scale" /> Weight
            </div>
            <strong>{pet.weight}</strong>
          </div>
          <div className="detail-box">
            <div className="detail-label">
              <Icon name="syringe" /> Vaccinated
            </div>
            <strong className={pet.vaccinated ? 'detail-success' : 'detail-warning'}>{pet.vaccinated ? 'Yes' : 'No'}</strong>
          </div>
          <div className="detail-box">
            <div className="detail-label">
              <Icon name="paw" /> Species
            </div>
            <strong>{pet.species}</strong>
          </div>
        </div>

        <div className="detail-section">
          <h4>
            <Icon name="note-sticky" /> About {pet.name}
          </h4>
          <p>{pet.notes || 'No notes added yet.'}</p>
        </div>

        <div className="detail-section">
          <h4>
            <Icon name="qrcode" /> Digital Pet ID
          </h4>
          <div className="pet-qr-row">
            {qr ? <img className="pet-qr-image" src={qr} alt={`QR code for ${pet.name}`} /> : <p className="pet-qr-loading">Generating QR code…</p>}
            <div className="pet-qr-info">
              <strong>{pet.name}'s Unique ID</strong>
              <code className="pet-uid-code">{pet.petUid || 'Not available yet'}</code>
              <p>
                Scan this QR code to view {pet.name}'s digital pet profile.
              </p>
            </div>
          </div>
        </div>

        <div className="pet-details-footer">
          <button type="button" className="pet-details-close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}