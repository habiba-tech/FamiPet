// Quick Actions for the PetGPT empty state.
//
// Every card is a shortcut into a REAL backend capability:
//   * "Ask about my pet", "Pet health advice", "Nutrition & diet",
//     "Symptoms / health concern", "General pet question" prefill the composer
//     with a real prompt the conversations API will process (pet-aware wording
//     when a real pet from the user's /pets is selected).
//   * "Find a veterinarian" loads the real veterinarian directory
//     (GET /api/veterinarians — public, real records).
// None of these are mock features and nothing invents an endpoint.

import { Icon } from '../../../components/shared/Icon'

export type QuickActionId = 'mypet' | 'health' | 'nutrition' | 'vet' | 'symptom' | 'general'

export interface PetChip {
  id: string
  name: string
  species: string
  image: string
}

interface QuickActionsProps {
  pets: PetChip[]
  selectedPetId: string | null
  onSelectPet: (id: string | null) => void
  onAsk: (prompt: string) => void
  onFindVet: () => void
}

function actionPrompt(pet: PetChip | undefined, base: (name: string) => string, generic: string): string {
  return pet ? base(pet.name) : generic
}

export function QuickActions({ pets, selectedPetId, onSelectPet, onAsk, onFindVet }: QuickActionsProps) {
  const pet = pets.find((p) => p.id === selectedPetId)

  const actions: {
    id: QuickActionId
    icon: string
    title: string
    desc: string
    accent: string
    run: () => void
  }[] = [
    {
      id: 'mypet',
      icon: 'paw-print',
      title: 'Ask about my pet',
      desc: 'Care tips for your pet',
      accent: 'from-pink-500/10 to-rose-500/5 text-pink-600 dark:text-pink-300',
      run: () =>
        onAsk(actionPrompt(pet, (n) => `What should I know about ${n}'s care?`, 'What should I know about my pet and its daily care?')),
    },
    {
      id: 'health',
      icon: 'heart-pulse',
      title: 'Pet health advice',
      desc: 'Wellness & checkup guidance',
      accent: 'from-emerald-500/10 to-teal-500/5 text-emerald-600 dark:text-emerald-300',
      run: () =>
        onAsk(actionPrompt(pet, (n) => `Share health advice for ${n} — I'd like wellness and checkup guidance.`, 'Share general health advice for my pet — wellness and checkup guidance.')),
    },
    {
      id: 'nutrition',
      icon: 'utensils',
      title: 'Nutrition & diet',
      desc: 'What to feed your pet',
      accent: 'from-amber-500/10 to-orange-500/5 text-amber-600 dark:text-amber-300',
      run: () =>
        onAsk(actionPrompt(pet, (n) => `What nutrition and diet would suit ${n}?`, 'What should my pet eat for good nutrition and diet?')),
    },
    {
      id: 'vet',
      icon: 'stethoscope',
      title: 'Find a veterinarian',
      desc: 'Browse real vet listings',
      accent: 'from-sky-500/10 to-blue-500/5 text-sky-600 dark:text-sky-300',
      run: onFindVet,
    },
    {
      id: 'symptom',
      icon: 'activity',
      title: 'Symptoms / health concern',
      desc: 'Know when to see a vet',
      accent: 'from-violet-500/10 to-purple-500/5 text-violet-600 dark:text-violet-300',
      run: () =>
        onAsk(
          actionPrompt(
            pet,
            (n) => `${n} is showing a symptom I'm worried about. What should I watch for, and when should I see a veterinarian?`,
            'My pet is showing a symptom I am worried about. What should I watch for, and when should I see a veterinarian?',
          ),
        ),
    },
    {
      id: 'general',
      icon: 'comments',
      title: 'General pet question',
      desc: 'Ask anything about pet care',
      accent: 'from-slate-500/10 to-neutral-500/5 text-slate-600 dark:text-slate-300',
      run: () => onAsk(''),
    },
  ]

  return (
    <div className="w-full">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-ink-light dark:text-slate-400">
        Quick actions
      </h3>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {actions.map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={a.run}
            className="group flex flex-col items-start gap-2 rounded-2xl border border-line bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-pink-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700"
          >
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-lg ${a.accent}`}
            >
              <Icon name={a.icon} />
            </span>
            <span className="text-sm font-semibold text-ink dark:text-slate-100">{a.title}</span>
            <span className="text-xs leading-tight text-ink-light dark:text-slate-400">{a.desc}</span>
          </button>
        ))}
      </div>

      {pets.length > 0 && (
        <div className="mt-5">
          <h4 className="text-xs font-semibold uppercase tracking-wide text-ink-light dark:text-slate-400">
            Pet context
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {pets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelectPet(selectedPetId === p.id ? null : p.id)}
                aria-pressed={selectedPetId === p.id}
                className={`flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 text-sm transition ${
                  selectedPetId === p.id
                    ? 'border-pink-300 bg-pink-50 text-pink-700 dark:border-pink-700 dark:bg-pink-950/40 dark:text-pink-200'
                    : 'border-line bg-white text-ink hover:border-pink-200 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200'
                }`}
              >
                <img src={p.image} alt="" className="h-6 w-6 rounded-full object-cover" />
                {p.name}
                <span className="text-xs text-ink-light dark:text-slate-400">{p.species}</span>
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-light dark:text-slate-500">
            PetGPT gets your pet context automatically from your account. Selecting a pet only personalises these
            prompts.
          </p>
        </div>
      )}
    </div>
  )
}