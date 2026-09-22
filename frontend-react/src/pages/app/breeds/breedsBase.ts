// Breed page helpers — port of frontend/js/breeds.js + breed-details.js data
// layer (speciesLabel, breedImage). React renders only real /breeds records;
// search matches name + origin (parity with the Vanilla filter).

import type { Breed } from '../../../api/breeds'

// Vanilla card/detail image fallbacks (the app's own assets, keyed by species).
export const BREED_FALLBACK_IMAGES: Record<string, string> = {
  cat: '/assets/images/my-pet/cat.png',
  bird: '/assets/images/my-pet/pet-tip.png',
}

export const BREED_DEFAULT_IMAGE = '/assets/images/my-pet/dog1.png'

export const SPECIES_TABS = [
  { value: 'all', label: 'All' },
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'bird', label: 'Birds' },
  { value: 'other', label: 'Others' },
] as const

export type SpeciesTabValue = (typeof SPECIES_TABS)[number]['value']

export function speciesLabel(species?: string): string {
  return String(species || '').replace(/^\w/, (c) => c.toUpperCase())
}

export function breedImage(b: Breed): string {
  if (b.images && b.images.length && b.images[0]) return b.images[0]
  return BREED_FALLBACK_IMAGES[b.species] || BREED_DEFAULT_IMAGE
}

export function breedSearchText(b: Breed): string {
  return `${b.name} ${b.origin || ''}`.toLowerCase()
}