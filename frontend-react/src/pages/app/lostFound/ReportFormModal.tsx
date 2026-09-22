// Report form modal — port of the Vanilla lost-found report modal
// (openReportModal + submitReport). Deltas (documented in migration.md):
// - Image upload goes through the backend's multer path (FormData `image`
//   file) instead of Vanilla's JSON `images: [dataURL]` — the same genuine
//   upload route the Phase 15 compose modal uses.
// - The Email and Age inputs are dropped: the backend LostFound model stores
//   neither (Vanilla collected them but never sent them in the payload).
// - Backend errors (400/401/...) render inline instead of a toast; an image
//   preview replaces the invisible file input.
// - Edit mode is new (the Vanilla page had no edit UI); the backend PUT is
//   owner-only and keeps the original date/photo when nothing new is chosen.

import { useEffect, useRef, useState } from 'react'
import { createReport, updateReport } from '../../../api/lostFound'
import { getUser } from '../../../api/client'
import { Icon } from '../../../components/shared/Icon'
import { assetUrl, type ReportView } from './lostFoundBase'

interface ReportFormModalProps {
  kind: 'lost' | 'found'
  editing: ReportView | null
  onClose: () => void
  onSaved: (message: string) => void
}

export function ReportFormModal({ kind, editing, onClose, onSaved }: ReportFormModalProps) {
  const [petName, setPetName] = useState(editing?.petName || '')
  const [phone, setPhone] = useState(editing?.contactPhone || '')
  const [species, setSpecies] = useState(editing?.species || '')
  const [location, setLocation] = useState(editing?.location || '')
  const [gender, setGender] = useState(editing?.genderValue || 'unknown')
  const [color, setColor] = useState(editing?.color || '')
  const [description, setDescription] = useState(editing?.description || '')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState(editing ? assetUrl(editing.image) || '' : '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const user = getUser()
  const userName = user?.name || 'Pet Parent'

  const title = kind === 'lost' ? (editing ? 'Edit Lost Pet Report' : 'Report a Lost Pet') : editing ? 'Edit Found Pet Report' : 'Report a Found Pet'
  const subtitle =
    kind === 'lost'
      ? 'Tell us about the pet so others can help bring them home.'
      : 'Tell us about the pet so we can help find their owner.'

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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const resetImage = () => {
    setImageFile(null)
    setPreview(editing ? assetUrl(editing.image) || '' : '')
    if (fileRef.current) fileRef.current.value = ''
  }

  const submit = async () => {
    if (saving) return
    setError('')
    if (!species) {
      setError('Please choose a pet type.')
      return
    }
    setSaving(true)
    try {
      const payload = new FormData()
      payload.append('type', kind)
      payload.append('petName', petName.trim() || (species.charAt(0).toUpperCase() + species.slice(1)))
      payload.append('species', species)
      payload.append('description', description.trim() || 'No additional description provided.')
      payload.append('location', location.trim() || 'Not specified')
      payload.append('contactName', userName)
      payload.append('contactPhone', phone.trim())
      payload.append('breed', '')
      payload.append('gender', gender)
      payload.append('color', color.trim() || 'Not specified')
      if (!editing) payload.append('date', new Date().toISOString().split('T')[0])
      if (imageFile) payload.append('image', imageFile)

      if (editing) {
        await updateReport(editing.id, payload)
        onSaved(kind === 'lost' ? 'Lost pet report updated successfully.' : 'Found pet report updated successfully.')
      } else {
        await createReport(payload)
        onSaved(kind === 'lost' ? 'Lost pet report added successfully.' : 'Found pet report added successfully.')
      }
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Could not submit the report.')
      setSaving(false)
    }
  }

  return (
    <div
      className="lost-modal-overlay show"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="lost-modal">
        <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
          <Icon name="x" />
        </button>

        <div className={`modal-icon ${kind}`}>
          <Icon name={kind === 'lost' ? 'magnifying-glass' : 'paw'} />
        </div>

        <h2>{title}</h2>
        <p className="modal-subtitle">{subtitle}</p>

        <form
          className="report-form"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <div className="form-group">
            <label htmlFor="reportPetName">Pet Name</label>
            <input
              id="reportPetName"
              type="text"
              placeholder="e.g. Coco"
              maxLength={50}
              required
              value={petName}
              onChange={(e) => setPetName(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="reportPetPhone">Phone Number</label>
            <input
              id="reportPetPhone"
              type="tel"
              placeholder="Enter 10-digit phone number"
              pattern="[0-9]{10}"
              maxLength={10}
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reportPetType">Pet Type</label>
              <select id="reportPetType" required value={species} onChange={(e) => setSpecies(e.target.value)}>
                <option value="">Select type</option>
                <option value="dog">Dog</option>
                <option value="cat">Cat</option>
                <option value="other">Other</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reportPetLocation">Location</label>
              <input
                id="reportPetLocation"
                type="text"
                placeholder="e.g. Andheri"
                required
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reportPetGender">Gender</label>
              <select id="reportPetGender" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="unknown">Prefer not to say</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="reportPetColor">Colour / Appearance</label>
              <input
                id="reportPetColor"
                type="text"
                placeholder="e.g. Golden, white & grey"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reportPetImage">Pet Image</label>
            <input id="reportPetImage" ref={fileRef} type="file" accept="image/*" onChange={onFileChange} />
            {editing && !imageFile && (
              <p className="report-image-hint">Current photo shown; choose a file to add another.</p>
            )}
            {preview && (
              <div className="report-image-preview">
                <img src={preview} alt="Selected pet" />
                <button type="button" onClick={resetImage}>
                  <Icon name="x" /> Remove
                </button>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="reportPetDescription">Description</label>
            <textarea
              id="reportPetDescription"
              rows={3}
              placeholder="Add useful details about the pet..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {error && <p className="modal-error">{error}</p>}

          <button type="submit" className="submit-report-btn" disabled={saving}>
            {saving ? (editing ? 'Updating...' : 'Submitting...') : editing ? 'Update Report' : 'Submit Report'}
          </button>
        </form>
      </div>
    </div>
  )
}