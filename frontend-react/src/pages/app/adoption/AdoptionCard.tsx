// Adoption card — port of the Vanilla `.pet-card` grid card (renderPetCards).
// Deltas (documented in migration.md): real backend data only (no static
// "healthy" badge — the backend has no health field, and AGENTS §9 forbids
// fabricated medical claims); gender icon uses the shared Icon map (mars/venus
// lucide glyphs) instead of Font Awesome; the heart reuses the shared
// FavoriteButton + useFavorites (Phase 17) so one liked-set covers the page.

import { Icon } from '../../../components/shared/Icon'
import { FavoriteButton } from '../../../components/shared/FavoriteButton'
import { FALLBACK_IMAGE, type AdoptionPetView } from './adoptionBase'

interface AdoptionCardProps {
  pet: AdoptionPetView
  liked: boolean
  onToggleFavorite: (petId: string, previouslyLiked: boolean) => void
  onDetails: (pet: AdoptionPetView) => void
}

export function AdoptionCard({ pet, liked, onToggleFavorite, onDetails }: AdoptionCardProps) {
  const detailsCount = [pet.breed, pet.age].filter(Boolean).join(' • ')
  return (
    <article className="pet-card" style={{ animation: 'fadeInUp 0.35s ease' }}>
      <div className="card-media">
        <img
          src={pet.image}
          alt={pet.name}
          loading="lazy"
          onError={(e) => {
            if ((e.target as HTMLImageElement).src !== FALLBACK_IMAGE) {
              ;(e.target as HTMLImageElement).src = FALLBACK_IMAGE
            }
          }}
        />
        <span className={`type-badge ${pet.type}`}>{pet.typeLabel}</span>
        <FavoriteButton petId={pet.id} name={pet.name} liked={liked} onToggle={onToggleFavorite} />
      </div>

      <div className="card-content">
        <div className="pet-title-row">
          <h3>{pet.name}</h3>
          {pet.gender && (
            <i className={`gender-icon ${pet.gender}`}>
              <Icon name={pet.genderIcon} />
            </i>
          )}
        </div>

        {detailsCount && <p className="pet-subinfo">{detailsCount}</p>}

        <div className="card-pill-tags">
          {pet.vaccinated && (
            <span className="badge-tag badge-vaccinated">
              <Icon name="circle-check" />
              Vaccinated
            </span>
          )}
        </div>

        <button type="button" className="view-details-btn" onClick={() => onDetails(pet)}>
          <Icon name="eye" />
          View Details
        </button>
      </div>
    </article>
  )
}