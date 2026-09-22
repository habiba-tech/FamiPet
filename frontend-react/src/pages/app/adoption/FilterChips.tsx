// FilterChips — the Vanilla `.cat-card` category filter row (All/Dogs/Cats/
// Others). Each chip carries a real PetCounterBadge for its category.

import { Icon } from '../../../components/shared/Icon'
import { PetCounterBadge } from './PetCounterBadge'
import { CATEGORIES, type CategoryValue } from './adoptionBase'

export interface FilterChipsProps {
  selected: CategoryValue
  counts: Record<CategoryValue, number>
  onSelect: (c: CategoryValue) => void
}

export function FilterChips({ selected, counts, onSelect }: FilterChipsProps) {
  return (
    <div className="category-cards">
      {CATEGORIES.map((cat) => (
        <button
          key={cat.value}
          type="button"
          className={`cat-card cat-${cat.value === 'others' ? 'others' : cat.value === 'dog' ? 'dogs' : cat.value === 'cat' ? 'cats' : 'all'}${selected === cat.value ? ' active' : ''}`}
          onClick={() => onSelect(cat.value)}
          aria-pressed={selected === cat.value}
        >
          <div className="cat-icon">
            <Icon name={cat.icon} />
          </div>
          <div className="cat-details">
            <strong>{cat.label}</strong>
            <span>
              {cat.sub} <PetCounterBadge count={counts[cat.value]} />
            </span>
          </div>
        </button>
      ))}
    </div>
  )
}