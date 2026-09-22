// Breed gallery card — port of the Vanilla `.breed-card` (renderBreeds in
// frontend/js/breeds.js). View Details toggles the inline detail block; the
// Open Full Page link navigates to the breed-details route. Only real /breeds
// records render (AGENTS §5).

import { Link } from 'react-router-dom'
import type { Breed } from '../../../api/breeds'
import { Icon } from '../../../components/shared/Icon'
import { breedImage, speciesLabel } from './breedsBase'

interface BreedCardProps {
  breed: Breed
  expanded: boolean
  onToggle: (id: string) => void
}

export function BreedCard({ breed, expanded, onToggle }: BreedCardProps) {
  const temperament = Array.isArray(breed.temperament) ? breed.temperament : []
  const diseases = Array.isArray(breed.commonDiseases) ? breed.commonDiseases : []

  const primaryImage = breedImage(breed)
  const fromRemote = !!(breed.images && breed.images[0])

  const infoRow = (label: string, value?: string) =>
    value
      ? (
        <div className="breed-info-row" key={label}>
          <strong>{label}</strong>
          <span>{value}</span>
        </div>
      )
      : null

  const fullRow = (label: string, value?: string) =>
    value
      ? (
        <div className="breed-info-row full" key={label}>
          <strong>{label}</strong>
          <span>{value}</span>
        </div>
      )
      : null

  const tag = (text: string, key: string) => (
    <span className="breed-tag" key={key}>
      {text}
    </span>
  )

  const toggle = () => onToggle(expanded ? '' : breed._id)

  return (
    <article className={`breed-card${expanded ? ' expanded' : ''}`} data-id={breed._id} onClick={toggle}>
      <div className="breed-card-img">
        <img
          src={primaryImage}
          alt={breed.name}
          loading="lazy"
          onError={(e) => {
            if (!fromRemote) return
            const el = e.target as HTMLImageElement
            el.src = breedImage(breed)
            el.onerror = null
          }}
        />
      </div>

      <div className="breed-card-body">
        <div className="breed-card-top">
          <h3>{breed.name}</h3>
          <span className="species-pill">{speciesLabel(breed.species)}</span>
        </div>

        <div className="breed-meta">
          {breed.origin && (
            <span>
              <Icon name="location-dot" />
              {breed.origin}
            </span>
          )}
          {breed.lifespan && (
            <span>
              <Icon name="heart" />
              {breed.lifespan}
            </span>
          )}
          {breed.weightRange && (
            <span>
              <Icon name="weight-scale" />
              {breed.weightRange}
            </span>
          )}
        </div>

        {breed.description && <p className="breed-desc">{breed.description}</p>}

        <div className="breed-card-detail">
          <div className="breed-detail-grid">
            {infoRow('Origin', breed.origin)}
            {infoRow('Lifespan', breed.lifespan)}
            {infoRow('Weight', breed.weightRange)}
            {infoRow('Height', breed.heightRange)}
          </div>

          {temperament.length > 0 && (
            <div className="breed-info-block">
              <h4>
                <Icon name="face-smile" />
                Temperament
              </h4>
              <div>{temperament.map((t, i) => tag(t, `temp-${i}`))}</div>
            </div>
          )}

          {fullRow('Exercise', breed.exerciseRequirements)}
          {fullRow('Grooming', breed.groomingGuide)}
          {fullRow('Suitable Environment', breed.suitableEnvironment)}

          {diseases.length > 0 && (
            <div className="breed-info-block">
              <h4>
                <Icon name="heart-pulse" />
                Common Health Concerns
              </h4>
              <div>{diseases.map((d, i) => tag(d, `disease-${i}`))}</div>
            </div>
          )}

          <Link className="breed-full-link" to={`/app/breeds/${breed._id}`} onClick={(e) => e.stopPropagation()}>
            <Icon name="up-right-from-square" />
            Open Full Page
          </Link>
        </div>

        <button className="breed-toggle-btn" type="button" aria-expanded={expanded} onClick={toggle}>
          <span className="show-label">View Details</span>
          <span className="hide-label">Hide Details</span>
          <Icon name="chevron-down" />
        </button>
      </div>
    </article>
  )
}