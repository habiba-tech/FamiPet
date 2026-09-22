// Shared heart toggle rendered on pet surfaces where the Vanilla site shows a
// `.favorite-button` (dashboard pet list today; adoption cards from Phase 18).
// Presentational: liked state + mutation live in the page's useFavorites() so
// multiple buttons on one surface share a single fetched favorite set.

import { Icon } from './Icon'

export function FavoriteButton({
  petId,
  name,
  liked,
  onToggle,
}: {
  petId: string
  name?: string
  liked: boolean
  onToggle: (petId: string, previouslyLiked: boolean) => void
}) {
  return (
    <button
      type="button"
      className={`favorite-button${liked ? ' liked' : ''}`}
      aria-label={`Favorite ${name || 'pet'}`}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle(String(petId), liked)
      }}
    >
      <Icon name="heart" />
    </button>
  )
}
