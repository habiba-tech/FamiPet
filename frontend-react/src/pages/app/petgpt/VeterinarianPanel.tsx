// Veterinarian directory panel — real records from GET /api/veterinarians
// (public endpoint from backend/routes/veterinarian.routes.js). No fabricated
// listings, no AI involvement: this is the actual veterinarian functionality.

import { useEffect, useState } from 'react'
import { getVeterinarians, type Veterinarian } from '../../../api/veterinarians'
import { Icon } from '../../../components/shared/Icon'

interface VeterinarianPanelProps {
  onBack: () => void
  onAskVet: (prompt: string) => void
}

export function VeterinarianPanel({ onBack, onAskVet }: VeterinarianPanelProps) {
  const [vets, setVets] = useState<Veterinarian[] | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    getVeterinarians()
      .then((res) => {
        if (cancelled) return
        setVets((res.veterinarians || []).filter((v) => v.isActive !== false))
      })
      .catch(() => {
        if (cancelled) return
        setFailed(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-ink dark:text-slate-100">Find a veterinarian</h3>
          <p className="text-sm text-ink-light dark:text-slate-400">
            Real listings from the FamiPet veterinarian directory.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 rounded-xl border border-line bg-white px-3 py-2 text-sm font-medium text-ink transition hover:border-pink-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
        >
          <Icon name="arrow-left" /> Back
        </button>
      </div>

      {vets === null && !failed && (
        <div className="mt-6 flex items-center gap-2 text-sm text-ink-light dark:text-slate-400">
          <Icon name="spinner" spin /> Loading veterinarians…
        </div>
      )}

      {failed && (
        <div className="mt-6 flex flex-col items-start gap-3 rounded-2xl border border-line bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <Icon name="triangle-exclamation" className="text-lg text-amber-500" />
          <div>
            <p className="text-sm font-semibold text-ink dark:text-slate-100">
              Couldn&apos;t load veterinarians
            </p>
            <p className="mt-1 text-sm text-ink-light dark:text-slate-400">
              The directory could not be reached. Please try again in a moment.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setVets(null)
              setFailed(false)
              getVeterinarians()
                .then((res) => setVets((res.veterinarians || []).filter((v) => v.isActive !== false)))
                .catch(() => setFailed(true))
            }}
            className="flex items-center gap-1.5 rounded-xl bg-primary px-3 py-2 text-sm font-medium text-white transition hover:bg-primary-dark"
          >
            <Icon name="rotate" /> Retry
          </button>
        </div>
      )}

      {vets !== null && vets.length === 0 && (
        <div className="mt-6 flex items-center gap-3 rounded-2xl border border-line bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
          <Icon name="search" className="text-lg text-ink-light dark:text-slate-400" />
          <p className="text-sm text-ink dark:text-slate-200">
            No veterinarians are listed yet. Ask PetGPT for guidance instead.
          </p>
        </div>
      )}

      {vets !== null && vets.length > 0 && (
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {vets.map((v) => (
            <div
              key={v._id}
              className="flex flex-col gap-2 rounded-2xl border border-line bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-300">
                  <Icon name="stethoscope" />
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink dark:text-slate-100">{v.name}</p>
                  {v.clinic && (
                    <p className="truncate text-sm text-ink-light dark:text-slate-400">{v.clinic}</p>
                  )}
                </div>
              </div>

              {(v.specialization && v.specialization.length > 0) || v.experience ? (
                <p className="text-sm text-ink-light dark:text-slate-400">
                  {v.specialization && v.specialization.length > 0
                    ? v.specialization.slice(0, 3).join(' · ')
                    : ''}
                  {v.experience ? ` · ${v.experience}+ yrs` : ''}
                </p>
              ) : null}

              {v.city && (
                <p className="flex items-center gap-1.5 text-sm text-ink-light dark:text-slate-400">
                  <Icon name="location-dot" /> {v.city}
                  {v.address ? ` · ${v.address}` : ''}
                </p>
              )}

              {v.phone && (
                <p className="mt-auto flex items-center gap-1.5 text-sm text-ink-light dark:text-slate-400">
                  <Icon name="phone" /> {v.phone}
                </p>
              )}

              <button
                type="button"
                onClick={() => onAskVet(`Tell me about ${v.name}${v.clinic ? ` at ${v.clinic}` : ''} and how I can book a visit.`)}
                className="mt-1 flex items-center justify-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2 text-sm font-medium text-sky-700 transition hover:bg-sky-100 dark:bg-sky-950/50 dark:text-sky-200 dark:hover:bg-sky-900/60"
              >
                <Icon name="arrow-right" /> Ask about this vet
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}