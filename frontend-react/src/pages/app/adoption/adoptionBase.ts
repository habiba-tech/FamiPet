// Adoption page helpers — port of frontend/js/adoption.js data layer
// (capFirst, adoptionType, toFrontendPet, fetchAdoptablePets). React renders
// only real backend pets (Vanilla seeded a static defaultPetsData array that
// real data replaced on load; AGENTS §5). Pet location is not a backend field
// (Vanilla hardcoded location: ""), so cards omit the empty location row.

import type { Pet } from '../../../api/pets'

// Vanilla card image fallback (the app's own asset).
export const FALLBACK_IMAGE = '/assets/images/adoption/pet1.jpg'

export const CATEGORIES = [
  { value: 'all', label: 'All Pets', sub: 'All available pets', icon: 'users' },
  { value: 'dog', label: 'Dogs', sub: 'Adorable doggos', icon: 'dog' },
  { value: 'cat', label: 'Cats', sub: 'Purrfect cats', icon: 'cat' },
  { value: 'others', label: 'Others', sub: 'Birds, rabbits & more', icon: 'paw' },
] as const

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'name', label: 'Name (A-Z)' },
  { value: 'age', label: 'Age' },
] as const

export type CategoryValue = (typeof CATEGORIES)[number]['value']
export type SortValue = (typeof SORT_OPTIONS)[number]['value']

// Vanilla adoptionType(): any non-dog/cat species renders under "Others".
export function adoptionType(species?: string): CategoryValue {
  const t = String(species || '').toLowerCase()
  return t === 'dog' || t === 'cat' ? t : 'others'
}

// Vanilla toFrontendPet(): gender icon symbol + labels used by the card.
export interface AdoptionPetView {
  id: string
  name: string
  gender: string
  genderIcon: string
  type: CategoryValue
  typeLabel: string
  breed: string
  age: string
  image: string
  vaccinated: boolean
  createdAt: number
  ownerName: string
  ownerPhone: string
  ownerEmail: string
}

export function toAdoptionPet(p: Pet): AdoptionPetView {
  const type = adoptionType(p.species)
  const label = type === 'dog' ? 'Dog' : type === 'cat' ? 'Cat' : 'Others'
  return {
    id: p._id,
    name: p.name,
    gender: p.gender || '',
    genderIcon: p.gender === 'male' ? 'mars' : p.gender === 'female' ? 'venus' : 'paw',
    type,
    typeLabel: label,
    breed: (typeof p.breed === 'object' && p.breed) ? p.breed.name || '' : (typeof p.breed === 'string' ? p.breed : ''),
    age: `${p.age} ${p.age === 1 ? 'Year' : 'Years'}`,
    image: (p.images && p.images.length) ? p.images[0] : FALLBACK_IMAGE,
    vaccinated: !!p.vaccinated,
    createdAt: p.createdAt ? new Date(p.createdAt).getTime() : 0,
    ownerName: (typeof p.owner === 'object' && p.owner) ? p.owner.name || '' : '',
    ownerPhone: (typeof p.owner === 'object' && p.owner) ? (p.owner as { phone?: string }).phone || '' : '',
    ownerEmail: (typeof p.owner === 'object' && p.owner) ? (p.owner as { email?: string }).email || '' : '',
  }
}

// Vanilla renderPetCards() search matched name + breed + location (always
// empty in practice); the React equivalent covers the same real fields.
export function petSearchText(p: AdoptionPetView): string {
  return `${p.name} ${p.breed}`.toLowerCase()
}