// Adoption modal — handles the Vanilla page's three modal stages in one
// component: view details (openDetails), then the adoption application form
// (openAdoptionForm, replacing the Vanilla email/city fields — the backend
// model stores neither, per Phase 9/16 precedent), then the success screen
// (showAdoptionSuccess) with the real persisted record.

import { useEffect, useState } from 'react'
import { Icon } from '../../../components/shared/Icon'
import { createAdoption } from '../../../api/adoptions'
import { type AdoptionPetView } from './adoptionBase'

interface AdoptionModalProps {
  pet: AdoptionPetView
  onClose: () => void
  onSubmitted: (petName: string) => void
}

type Stage = 'details' | 'apply' | 'success'

export function AdoptionModal({ pet, onClose, onSubmitted }: AdoptionModalProps) {
  const [stage, setStage] = useState<Stage>('details')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [record, setRecord] = useState<{ id: string; status: string } | null>(null)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const detailsCount = [pet.breed, pet.age].filter(Boolean).join(' • ')

  const submit = (form: HTMLFormElement) => {
    const data = new FormData(form)
    const payload = {
      pet: pet.id,
      fullName: String(data.get('adopterName') || ''),
      phone: String(data.get('adopterPhone') || ''),
      address: String(data.get('address') || ''),
      occupation: String(data.get('homeType') || ''),
      experienceWithPets: String(data.get('experience') || ''),
      reasonForAdoption: String(data.get('reason') || ''),
    }
    setSubmitting(true)
    setError('')
    createAdoption(payload)
      .then((res) => {
        const adoption: { _id?: string; status?: string } = res.adoption || {}
        setRecord({
          id: adoption._id || `FAMI-${Date.now()}`,
          status: adoption.status || 'Pending',
        })
        setStage('success')
        onSubmitted(pet.name)
      })
      .catch((err) => {
        setError((err instanceof Error && err.message) || 'Could not submit application. Please try again.')
        setSubmitting(false)
      })
  }

  return (
    <div
      className="modal-backdrop open"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="modal-sheet">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>

        {stage === 'details' && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={pet.image}
              alt={pet.name}
              style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover', marginBottom: '1rem' }}
            />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.25rem', color: '#1e293b' }}>
              {pet.name}
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{detailsCount || '—'}</p>
            <p style={{ fontSize: '0.9rem', lineHeight: 1.6, color: '#334155', marginBottom: '1.5rem' }}>
              {pet.name} is looking for a loving companion to call home. Give them the home they deserve today!
            </p>
            <button
              type="button"
              className="adoption-cta-btn"
              onClick={() => {
                setStage('apply')
                setError('')
              }}
            >
              Proceed with Adoption
            </button>
          </div>
        )}

        {stage === 'apply' && (
          <div style={{ paddingTop: '0.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
              <div className="adoption-modal-icon">
                <Icon name="heart" />
              </div>
              <h2 className="adoption-modal-title">Adoption Application</h2>
              <p className="adoption-modal-sub">Fill in your details to start the adoption process.</p>
            </div>

            <div className="adoption-pet-summary">
              <img src={pet.image} alt={pet.name} />
              <div>
                <h3>{pet.name}</h3>
                <p>{pet.breed} • {pet.age}</p>
              </div>
            </div>

            <div className="adoption-owner-box">
              <h3>
                <Icon name="user" /> Pet Owner Information
              </h3>
              <div className="adoption-owner-grid">
                <div>
                  <small>Owner Name</small>
                  <strong>{pet.ownerName || 'Not provided'}</strong>
                </div>
                <div>
                  <small>Phone</small>
                  <strong>{pet.ownerPhone || 'Not provided'}</strong>
                </div>
                <div>
                  <small>Email</small>
                  <strong>{pet.ownerEmail || 'Not provided'}</strong>
                </div>
              </div>
            </div>

            <form
              id="adoptionApplicationForm"
              onSubmit={(e) => {
                e.preventDefault()
                submit(e.currentTarget)
              }}
            >
              <h3 className="adoption-form-heading">
                <Icon name="note-sticky" />
                Your Information
              </h3>

              <div className="adoption-form-grid">
                <label>
                  <span>Full Name *</span>
                  <input name="adopterName" required placeholder="Enter your full name" autoComplete="name" />
                </label>
                <label>
                  <span>Phone Number *</span>
                  <input name="adopterPhone" type="tel" required placeholder="+91 98765 43210" autoComplete="tel" />
                </label>
                <label className="full-adoption-field">
                  <span>Address *</span>
                  <textarea name="address" required rows={3} placeholder="Enter your complete address" />
                </label>
                <label>
                  <span>Home Type *</span>
                  <select name="homeType" required defaultValue="">
                    <option value="" disabled>Select</option>
                    <option>Apartment</option>
                    <option>Independent House</option>
                    <option>Villa</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  <span>Pet Experience *</span>
                  <select name="experience" required defaultValue="">
                    <option value="" disabled>Select</option>
                    <option>First-time pet owner</option>
                    <option>Some experience</option>
                    <option>Experienced pet owner</option>
                  </select>
                </label>
                <label className="full-adoption-field">
                  <span>Why do you want to adopt this pet? *</span>
                  <textarea name="reason" required rows={3} placeholder="Tell us why you want to adopt..." />
                </label>
              </div>

              {error && (
                <p className="adoption-form-error">
                  <Icon name="triangle-exclamation" /> {error}
                </p>
              )}

              <div className="adoption-form-actions">
                <button type="button" className="adoption-cancel-btn" onClick={onClose}>
                  Cancel
                </button>
                <button type="submit" className="adoption-submit-btn" disabled={submitting}>
                  <Icon name="check" />
                  {submitting ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        )}

        {stage === 'success' && (
          <div style={{ textAlign: 'center', padding: '2rem 0.5rem' }}>
            <div className="adoption-success-icon">
              <Icon name="check" />
            </div>
            <h2 className="adoption-modal-title">Application Submitted!</h2>
            <p className="adoption-success-text">
              Your adoption application for <strong>{pet.name}</strong> has been recorded successfully.
            </p>

            {record && (
              <div className="adoption-record-box">
                <small>Adoption Record ID</small>
                <strong>{record.id}</strong>
              </div>
            )}

            <p className="adoption-success-text">
              Status: <strong>{record?.status || 'Pending'}</strong>
            </p>

            <button type="button" className="adoption-cta-btn" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  )
}