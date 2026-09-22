// Phase 14 Reminders — Add/Edit modal. React port of the reminder modal built
// by frontend/js/reminders.js (openReminderModal), following the Phase 9-13
// modal conventions: Escape/backdrop close, inline validation error instead of
// alert()-return, disabled submit while saving. Pet/type/date/time are all
// required exactly as Vanilla validated. Payload mirrors Vanilla's
// (title = `${type} reminder for ${pet}`, date, time, description, pet id).

import { useEffect, useState, type FormEvent } from 'react'
import { createReminder, updateReminder } from '../../../api/reminders'
import { Icon } from '../../../components/shared/Icon'
import type { PetView } from '../mypet/petBase'
import { convertTimeToInput, mapTypeToBackend, REMINDER_TYPES, type ReminderView } from './remindersBase'

interface Props {
  pets: PetView[]
  editing?: ReminderView | null
  onClose: () => void
  onSaved: () => Promise<void> | void
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function ReminderFormModal({ pets, editing, onClose, onSaved }: Props) {
  const [pet, setPet] = useState(editing?.petId || '')
  const [type, setType] = useState(editing?.type || '')
  const [date, setDate] = useState(editing?.date || todayISO())
  const [time, setTime] = useState(editing ? convertTimeToInput(editing.time) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const selectedPet = pets.find((p) => p.id === pet)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!pet) {
      setError('Please select a pet.')
      return
    }
    if (!type) {
      setError('Please select a reminder type.')
      return
    }
    if (!date || !time) {
      setError('Please select a date and time.')
      return
    }
    setError('')
    setSaving(true)
    const petName = selectedPet ? selectedPet.name : editing ? editing.pet : 'your pet'
    const payload = {
      title: `${type} reminder for ${petName}`,
      type: mapTypeToBackend(type),
      date,
      time,
      description: '',
      pet,
    }
    try {
      if (editing) {
        await updateReminder(editing.id, payload)
      } else {
        await createReminder(payload)
      }
      await onSaved()
      onClose()
    } catch (err) {
      setError((err as Error).message || 'Failed to save reminder. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="reminder-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="reminder-modal" role="dialog" aria-modal="true" aria-label={editing ? 'Edit Reminder' : 'Add Reminder'}>
        <div className="reminder-modal-header">
          <div>
            <span className="modal-eyebrow">{editing ? 'UPDATE REMINDER' : 'NEW REMINDER'}</span>
            <h2>{editing ? 'Edit Reminder' : 'Add Reminder'}</h2>
          </div>
          <button className="modal-close" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <form className="reminder-form" onSubmit={onSubmit}>
          <div className="form-group">
            <label htmlFor="reminderPet">Pet Name</label>
            <select id="reminderPet" value={pet} onChange={(e) => setPet(e.target.value)} required>
              <option value="">Select a pet</option>
              {pets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {editing && pet && !pets.find((p) => p.id === pet) && (
                <option value={pet}>No pet</option>
              )}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="reminderType">Reminder Type</label>
            <select id="reminderType" value={type} onChange={(e) => setType(e.target.value)} required>
              <option value="">Select reminder</option>
              {REMINDER_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reminderDate">Date</label>
              <input id="reminderDate" type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="form-group">
              <label htmlFor="reminderTime">Time</label>
              <input id="reminderTime" type="time" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
          </div>

          {error && (
            <div className="form-error" role="alert">
              {error}
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="modal-cancel" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="modal-save" disabled={saving}>
              <Icon name="check" />
              {editing ? 'Save Changes' : 'Add Reminder'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}