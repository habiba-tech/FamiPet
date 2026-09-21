// React port of the Add/Edit Pet modal in frontend/js/mypet.js (openPetModal).
//
// Deltas from Vanilla (documented in migration.md Phase 9):
// - Health Status + Upcoming Appointment fields dropped — nothing is persisted
//   for either on the backend; Vanilla silently discarded both on save.
// - Custom species text dropped: the backend Pet.species enum only allows
//   dog/cat/bird/rabbit/fish/other, so a custom name could never be saved.
// - API errors render inline (`.pet-form-error`) instead of alert().

import { useEffect, useRef, useState, type FormEvent } from 'react'
import { createPet, updatePet } from '../../../api/pets'
import { Icon } from '../../../components/shared/Icon'
import { BREEDS, buildPetPayload, type PetView } from './petBase'

const AGE_OPTIONS = [
  '2 Months',
  '4 Months',
  '6 Months',
  '1 Year',
  '2 Years',
  '3 Years',
  '4 Years',
  '5 Years',
  '6 Years',
  '7 Years',
  '8 Years',
  '9 Years',
  '10 Years',
]

const WEIGHT_OPTIONS = ['1 kg', '2 kg', '3 kg', '4 kg', '5 kg', '7 kg', '10 kg', '15 kg', '20 kg', '25 kg', '30 kg', '35 kg', '40 kg']

interface Props {
  editing: PetView | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

export function PetFormModal({ editing, onClose, onSaved }: Props) {
  const isEditing = editing !== null
  const [name, setName] = useState(editing?.name || '')
  const [species, setSpecies] = useState(editing?.species || '')
  const [breed, setBreed] = useState(editing?.breed || '')
  const [customBreed, setCustomBreed] = useState('')
  const [gender, setGender] = useState(editing?.gender || '')
  const [age, setAge] = useState(editing?.age.replace(/\s*(Year|Years|yr|yrs)?$/i, '').trim() || '')
  const [weight, setWeight] = useState(editing?.weight.replace(/\s*kg$/i, '').trim() || '')
  const [vaccinated, setVaccinated] = useState(editing ? (editing.vaccinated ? 'Yes' : 'No') : '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [photo, setPhoto] = useState<string | null>(editing?.image || null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const overlayRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const speciesBreeds = species ? (BREEDS[species] as string[] | undefined) : undefined
  const breedOptions = speciesBreeds
    ? ['', ...speciesBreeds]
    : species
      ? ['', 'Other']
      : ['']
  const showCustomBreed =
    breed === 'Other' || (isEditing && !!editing.breed && editing.breed !== 'Other' && speciesBreeds && !speciesBreeds.includes(editing.breed))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && overlayRef.current) onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const setSpeciesAndResetBreed = (value: string) => {
    setSpecies(value)
    setBreed('')
  }

  const readPhoto = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setPhoto(String(reader.result))
    reader.readAsDataURL(file)
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const effectiveBreed = showCustomBreed ? customBreed.trim() : breed
    if (!name.trim() || !species || !effectiveBreed || !gender || !age.trim() || !weight.trim() || !vaccinated) {
      setError('Please fill all required fields.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = buildPetPayload({
        name: name.trim(),
        species,
        breed: effectiveBreed,
        gender,
        age,
        weight,
        vaccinated: vaccinated === 'Yes',
        notes,
      })
      if (isEditing && editing) {
        await updatePet(editing.id, payload)
      } else {
        await createPet(payload)
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="pet-modal-overlay show" ref={overlayRef}>
      <div className="pet-modal">
        <div className="pet-modal-header">
          <div className="pet-modal-title">
            <div className="pet-modal-icon">
              <Icon name="paw" />
            </div>
            <div>
              <h2>{isEditing ? 'Edit Pet' : 'Add New Pet'}</h2>
              <p>{isEditing ? "Update your pet's information" : 'Add your furry friend to Famipet'}</p>
            </div>
          </div>
          <button type="button" className="pet-modal-close" onClick={onClose} aria-label="Close">
            <Icon name="x" />
          </button>
        </div>

        <form onSubmit={onSubmit}>
          <div className="pet-modal-body">
            <div className="pet-photo-section">
              <div className="pet-photo-preview">{photo ? <img src={photo} alt="Pet" /> : <Icon name="camera" />}</div>
              <div className="pet-photo-info">
                <h4>Pet Photo</h4>
                <p>Add a cute photo of your pet</p>
                <label className="pet-photo-label">
                  <Icon name="upload" />
                  Choose Photo
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={(e) => readPhoto(e.target.files?.[0])} />
                </label>
              </div>
            </div>

            {error && (
              <div className="pet-form-error" role="alert">
                {error}
              </div>
            )}

            <div className="pet-form-grid">
              <div className="pet-form-group">
                <label>
                  Pet Name <span>*</span>
                </label>
                <input type="text" placeholder="e.g. Bruno" value={name} onChange={(e) => setName(e.target.value)} required />
              </div>

              <div className="pet-form-group">
                <label>
                  Species <span>*</span>
                </label>
                <select
                  value={species}
                  onChange={(e) => setSpeciesAndResetBreed(e.target.value)}
                  required
                >
                  <option value="">Choose species</option>
                  {(['Dog', 'Cat', 'Bird', 'Other'] as const).map((s) => (
                    <option key={s} value={s}>
                      {s === 'Dog' ? '🐶' : s === 'Cat' ? '🐱' : s === 'Bird' ? '🐦' : '🐾'} {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pet-form-group">
                <label>
                  Breed <span>*</span>
                </label>
                <select value={showCustomBreed ? '' : breed} onChange={(e) => setBreed(e.target.value)} required>
                  {breedOptions.map((b, i) => (
                    <option key={i} value={b}>
                      {b || (speciesBreeds ? 'Choose breed' : species ? 'Enter or choose breed' : 'Choose species first')}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Enter your pet's breed"
                  value={customBreed}
                  onChange={(e) => setCustomBreed(e.target.value)}
                  style={showCustomBreed ? { display: 'block', marginTop: 10 } : { display: 'none' }}
                />
              </div>

              <div className="pet-form-group">
                <label>
                  Gender <span>*</span>
                </label>
                <select value={gender} onChange={(e) => setGender(e.target.value)} required>
                  <option value="">Choose gender</option>
                  <option value="Male">♂ Male</option>
                  <option value="Female">♀ Female</option>
                </select>
              </div>

              <div className="pet-form-group">
                <label>
                  Age <span>*</span>
                </label>
                <input list="ageOptions" placeholder="Choose or type age" value={age} onChange={(e) => setAge(e.target.value)} required />
                <datalist id="ageOptions">
                  {AGE_OPTIONS.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
                <span className="form-hint">Choose an age or type your own</span>
              </div>

              <div className="pet-form-group">
                <label>
                  Weight <span>*</span>
                </label>
                <input list="weightOptions" placeholder="Choose or type weight" value={weight} onChange={(e) => setWeight(e.target.value)} required />
                <datalist id="weightOptions">
                  {WEIGHT_OPTIONS.map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
                <span className="form-hint">Choose a weight or type your own</span>
              </div>

              <div className="pet-form-group">
                <label>
                  Vaccination <span>*</span>
                </label>
                <select value={vaccinated} onChange={(e) => setVaccinated(e.target.value)} required>
                  <option value="">Choose status</option>
                  <option value="Yes">✓ Vaccinated</option>
                  <option value="No">Not Vaccinated</option>
                </select>
              </div>

              <div className="pet-form-group full-width">
                <label>Notes</label>
                <textarea
                  placeholder="Anything you'd like to remember about your pet..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
                <span className="form-hint">Optional</span>
              </div>
            </div>
          </div>

          <div className="pet-modal-footer">
            <button type="button" className="pet-modal-btn pet-modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="pet-modal-btn pet-modal-submit" disabled={saving}>
              <Icon name="plus" />
              {saving ? 'Saving…' : isEditing ? 'Save Changes' : 'Add Pet'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}