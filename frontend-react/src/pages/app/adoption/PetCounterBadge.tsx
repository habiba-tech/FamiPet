// PetCounterBadge — live real count badge shown on each filter chip. The
// Vanilla adoption page had no counter (its cat-cards showed static subtitle
// text); the phase requires counters, built from the actual loaded pets.

export function PetCounterBadge({ count }: { count: number }) {
  return <span className="pet-counter-badge">{count}</span>
}