// Phase 10 Health — React port of the Add/Edit Health Record modal in
// frontend/js/health.js. Phase 9's PetFormModal established the React modal
// conventions this file mirrors: Escape/backdrop close, inline error instead
// of alert(), disabled submit while saving.
//
// Delta from Vanilla: Vanilla only created records; edit is new (Phase 10
// verification requires list/create/edit/delete scoped to the selected pet).

import { useEffect, useState, type FormEvent } from 'react'
import { createHealthRecord, updateHealthRecord, type HealthRecord } from '../../../api/health'
import { Icon } from '../../../components/shared/Icon'
import { RECORD_TYPES, toISO } from './healthBase'

interface Props {
  petId: string
  editing: HealthRecord | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function RecordFormModal({ petId, editing, onClose, onSaved }: Props) {
  const [type, setType] = useState(editing?.diagnosis || '')
  const [date, setDate] = useState(toISO(editing?.visitDate) || todayISO())
  const [vet, setVet] = useState(editing?.doctor || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!type.trim() || !date) {
      setError('Please select a record type and date.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = { pet: petId, diagnosis: type.trim(), visitDate: date, doctor: vet.trim() || undefined, notes: notes.trim() || undefined }
      if (editing) {
        await updateHealthRecord(editing._id, payload)
      } else {
        await createHealthRecord(payload)
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to save record. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Health Record' : 'Add Health Record'}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>

        <div className="modal-header">
          <div className="modal-icon">
            <Icon name="file-medical" />
          </div>
          <div>
            <h2>{editing ? 'Edit Health Record' : 'Add Health Record'}</h2>
            <p>{editing ? 'Update this medical record.' : 'Add a new medical record for your pet.'}</p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="recordType">Record Type</label>
            <select id="recordType" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Select record type</option>
              {RECORD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="recordDate">Date</label>
              <input id="recordDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="vetName">Veterinarian</label>
              <input id="vetName" type="text" placeholder="Veterinarian name" value={vet} onChange={(e) => setVet(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="recordNotes">Notes</label>
            <textarea id="recordNotes" rows={4} placeholder="Add health notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="save-record-btn" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Health Record'}
          </button>
        </form>
      </div>
    </div>
  )
}