// Phase 11 Vaccinations — Add/Edit vaccination modal. Mirrors the Phase 10
// RecordFormModal conventions (Escape/backdrop close, inline error instead of
// alert(), disabled submit while saving), but has no Vanilla counterpart:
// health.js only listed vaccinations, so both create and edit forms are new
// (the migration plan requires full CRUD; the backend has supported it all
// along).

import { useEffect, useState, type FormEvent } from 'react'
import { createVaccination, updateVaccination, type Vaccination } from '../../../../api/vaccinations'
import { Icon } from '../../../../components/shared/Icon'

interface Props {
  petId: string
  editing: Vaccination | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

function dateToISO(value?: string): string {
  if (!value) return ''
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0]
}

export function VaccineFormModal({ petId, editing, onClose, onSaved }: Props) {
  const [name, setName] = useState(editing?.vaccineName || '')
  const [dose, setDose] = useState(editing?.doseNumber ? String(editing.doseNumber) : '')
  const [vaccinationDate, setVaccinationDate] = useState(dateToISO(editing?.vaccinationDate) || todayISO())
  const [nextDueDate, setNextDueDate] = useState(dateToISO(editing?.nextDueDate) || '')
  const [vet, setVet] = useState(editing?.veterinarian || '')
  const [hospital, setHospital] = useState(editing?.hospital || '')
  const [notes, setNotes] = useState(editing?.notes || '')
  const [status, setStatus] = useState<'Pending' | 'Completed'>(editing?.status || 'Pending')
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
    if (!name.trim()) {
      setError('Please enter a vaccine name.')
      return
    }
    if (!vaccinationDate || !nextDueDate) {
      setError('Vaccination date and next due date are required.')
      return
    }
    setError('')
    setSaving(true)
    try {
      const payload = {
        pet: petId,
        vaccineName: name.trim(),
        vaccinationDate,
        nextDueDate,
        doseNumber: dose ? Number(dose) : undefined,
        veterinarian: vet.trim() || undefined,
        hospital: hospital.trim() || undefined,
        notes: notes.trim() || undefined,
        status,
      }
      if (editing) {
        await updateVaccination(editing._id, payload)
      } else {
        await createVaccination(payload)
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to save vaccination. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-backdrop open" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-sheet" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Vaccination' : 'Add Vaccination'}>
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
          <Icon name="x" />
        </button>

        <div className="modal-header">
          <div className="modal-icon">
            <Icon name="syringe" />
          </div>
          <div>
            <h2>{editing ? 'Edit Vaccination' : 'Add Vaccination'}</h2>
            <p>{editing ? 'Update this vaccination record.' : 'Record a vaccination for your pet.'}</p>
          </div>
        </div>

        <form onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="vaccineName">Vaccine Name</label>
            <input id="vaccineName" type="text" placeholder="e.g. Rabies, DHPP" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vaccinationDate">Vaccination Date</label>
              <input id="vaccinationDate" type="date" value={vaccinationDate} onChange={(e) => setVaccinationDate(e.target.value)} required />
            </div>

            <div className="form-group">
              <label htmlFor="nextDueDate">Next Due Date</label>
              <input id="nextDueDate" type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} required />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="doseNumber">Dose Number</label>
              <input id="doseNumber" type="number" min={1} placeholder="e.g. 1" value={dose} onChange={(e) => setDose(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="vaccineStatus">Status</label>
              <select id="vaccineStatus" value={status} onChange={(e) => setStatus(e.target.value as 'Pending' | 'Completed')}>
                <option value="Pending">Pending</option>
                <option value="Completed">Completed</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="vetName">Veterinarian</label>
              <input id="vetName" type="text" placeholder="Veterinarian name" value={vet} onChange={(e) => setVet(e.target.value)} />
            </div>

            <div className="form-group">
              <label htmlFor="hospitalName">Hospital / Clinic</label>
              <input id="hospitalName" type="text" placeholder="Clinic name" value={hospital} onChange={(e) => setHospital(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="vaccineNotes">Notes</label>
            <textarea id="vaccineNotes" rows={3} placeholder="Add notes..." value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <button type="submit" className="save-record-btn" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save Changes' : 'Save Vaccination'}
          </button>
        </form>
      </div>
    </div>
  )
}