// Public Pet Details — the destination a Digital Pet ID QR code resolves to
// (the QR payload is `${CLIENT_URL}/pet/:petUid`, backend GET /api/pets/public/:petUid).
// Deliberately a public route OUTSIDE any auth guard: a scanned QR must render
// for anyone, with or without a session. The backend only ever returns
// intentionally public fields (pet facts + owner display name) so nothing here
// needs the current user.

import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getPublicPetByUid, type PublicPet } from '../../api/pets'
import { Icon } from '../../components/shared/Icon'
import { ageText } from '../../lib/formatters'

export function PublicPetDetailsPage() {
  const { petUid } = useParams<{ petUid: string }>()
  const [pet, setPet] = useState<PublicPet | null>(null)
  const [state, setState] = useState<'loading' | 'ok' | 'missing'>('loading')

  useEffect(() => {
    if (!petUid) {
      setState('missing')
      return
    }
    setState('loading')
    getPublicPetByUid(petUid)
      .then((res) => {
        if (res.pet) {
          setPet(res.pet)
          setState('ok')
        } else {
          setState('missing')
        }
      })
      .catch(() => setState('missing'))
  }, [petUid])

  if (state === 'loading') {
    return (
      <div className="public-pet-page">
        <div className="public-pet-state">
          <Icon name="circle-notch" spin style={{ fontSize: 28 }} />
          <span style={{ marginTop: 8 }}>Loading pet details...</span>
        </div>
      </div>
    )
  }

  if (state === 'missing' || !pet) {
    return (
      <div className="public-pet-page">
        <div className="public-pet-state">
          <Icon name="paw" style={{ fontSize: 30 }} />
          <h2>Pet Not Found</h2>
          <p>This digital pet ID could not be found. It may have been removed or the link may be wrong.</p>
          <Link className="public-pet-btn" to="/">
            Back to FamiPet
          </Link>
        </div>
      </div>
    )
  }

  const image = pet.images && pet.images[0] ? pet.images[0] : null

  return (
    <div className="public-pet-page">
      <div className="public-pet-card">
        <div className="public-pet-photo">
          {image ? (
            <img src={image} alt={pet.name} />
          ) : (
            <div className="public-pet-photo-fallback">
              <Icon name="paw" style={{ fontSize: 56 }} />
            </div>
          )}
        </div>

        <div className="public-pet-info">
          <div className="public-pet-badge">Digital Pet ID</div>
          <h1>{pet.name}</h1>
          <p className="public-pet-breed">
            {[pet.breed, pet.species ? pet.species.charAt(0).toUpperCase() + pet.species.slice(1) : '']
              .filter(Boolean)
              .join(' • ')}
          </p>

          <dl className="public-pet-facts">
            {pet.gender ? (
              <div>
                <dt>Gender</dt>
                <dd>{pet.gender}</dd>
              </div>
            ) : null}
            {pet.age ? (
              <div>
                <dt>Age</dt>
                <dd>{ageText(pet)}</dd>
              </div>
            ) : null}
            {pet.weight ? (
              <div>
                <dt>Weight</dt>
                <dd>{pet.weight} kg</dd>
              </div>
            ) : null}
            {pet.color ? (
              <div>
                <dt>Color</dt>
                <dd>{pet.color}</dd>
              </div>
            ) : null}
            {typeof pet.vaccinated === 'boolean' ? (
              <div>
                <dt>Vaccinated</dt>
                <dd>{pet.vaccinated ? 'Yes' : 'No'}</dd>
              </div>
            ) : null}
          </dl>

          {pet.description ? <p className="public-pet-desc">{pet.description}</p> : null}

          <p className="public-pet-owner">
            <Icon name="user" /> Currently cared for by{' '}
            <strong>{(pet.owner && pet.owner.name) || 'a FamiPet member'}</strong>
          </p>

          <Link className="public-pet-btn" to="/">
            Back to FamiPet
          </Link>
        </div>
      </div>
    </div>
  )
}