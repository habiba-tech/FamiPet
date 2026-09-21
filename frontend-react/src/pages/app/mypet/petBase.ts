// Shared My Pets / Pet ID helpers — ports of the constants and formatters in
// frontend/js/mypet.js (breeds map, getSpeciesImage, getGenderIcon, capFirst,
// toFrontendPet, buildPetPayload, parsePetAge).

import type { Pet, PetPayload } from '../../../api/pets'

// The My Pets form only offers these species (Vanilla mypet.html); the backend
// Pet.species enum is [dog, cat, bird, rabbit, fish, other] so a custom
// species name cannot be persisted — Vanilla's custom-species field would fail
// validation on save. The "Other" option is sent as `other`.
export const SPECIES_LIST = ['Dog', 'Cat', 'Bird', 'Other'] as const

export const BREEDS: Record<string, string[]> = {
  Dog: [
    'Labrador Retriever',
    'Golden Retriever',
    'German Shepherd',
    'Beagle',
    'Pug',
    'Shih Tzu',
    'Pomeranian',
    'Rottweiler',
    'Husky',
    'Dachshund',
    'Cocker Spaniel',
    'Indie / Indian Pariah',
    'Other',
  ],
  Cat: [
    'Persian',
    'Siamese',
    'Maine Coon',
    'British Shorthair',
    'Ragdoll',
    'Bengal',
    'Bombay',
    'Himalayan',
    'Indie / Domestic Shorthair',
    'Other',
  ],
  Bird: ['Parrot', 'Budgerigar', 'Cockatiel', 'Lovebird', 'Finch', 'Canary', 'Macaw', 'Other'],
}

export function capFirst(s?: string | null): string {
  return String(s || '').trim().replace(/^\w/, (c) => c.toUpperCase())
}

// Vanilla getSpeciesImage() takes the capitalized species ("Dog", "Cat").
export function speciesImage(species?: string | null): string {
  const s = capFirst(species)
  if (s === 'Dog') return '/assets/images/my-pet/dog1.png'
  if (s === 'Cat') return '/assets/images/my-pet/cat.png'
  if (s === 'Bird') return '/assets/images/my-pet/pet-tip.png'
  return '/assets/images/dashboard/cute-pet.svg'
}

export function genderIcon(gender?: string | null): string {
  return gender === 'Female' ? 'fa-venus' : 'fa-mars'
}

export function parsePetAge(input: string | number | null | undefined): number {
  const match = String(input || '').trim().match(/(\d+(?:\.\d+)?)/)
  return match ? parseFloat(match[1]) : NaN
}

// Read model used by the My Pets page + Pet ID page. Mirrors Vanilla
// toFrontendPet() minus the fabricated `health`/"Good" and the never-persisted
// `appointment` flag (backend has no fields for either).
export interface PetView {
  id: string
  name: string
  breed: string
  species: string
  gender: string
  age: string
  weight: string
  vaccinated: boolean
  notes: string
  image: string
  petUid: string
  qrCode: string
}

export function toPetView(p: Pet): PetView {
  const species = capFirst(p.species)
  const breed = (p.breed && typeof p.breed === 'object' && p.breed.name) || (typeof p.breed === 'string' ? p.breed : '') || ''
  return {
    id: p._id,
    name: p.name,
    breed,
    species,
    gender: capFirst(p.gender),
    age: `${p.age} ${p.age === 1 ? 'Year' : 'Years'}`,
    weight: `${p.weight} kg`,
    vaccinated: !!p.vaccinated,
    notes: p.description || '',
    image: (p.images && p.images.length && p.images[0]) || speciesImage(species),
    petUid: p.petUid || '',
    qrCode: p.qrCode || '',
  }
}

// Mirrors Vanilla buildPetPayload(); age/weight parsed to numbers, species/
// gender lowercased for the backend enums.
export function buildPetPayload(p: {
  name: string
  species: string
  breed: string
  gender: string
  age: string
  weight: string
  vaccinated: boolean
  notes?: string
}): PetPayload {
  return {
    name: p.name,
    species: String(p.species).toLowerCase(),
    breed: p.breed,
    gender: String(p.gender).toLowerCase(),
    age: parsePetAge(p.age),
    weight: parseFloat(p.weight) || 0,
    vaccinated: p.vaccinated,
    description: p.notes || '',
  }
}