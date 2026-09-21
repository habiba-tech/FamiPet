// Ports of the formatters in frontend/js/dashboard-data.js, minus `esc()`
// (React escapes HTML automatically). `petImage()` returns absolute SPA paths
// (public/ is served from the app root).

export function fmtDate(d?: string | Date | null): string {
  if (!d) return ''
  const date = new Date(d)
  if (isNaN(date.getTime())) return String(d)
  return date.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
}

export function fmtTime(t?: string | null): string {
  if (!t) return ''
  if (/^\d{1,2}:\d{2}/.test(t)) {
    const [h, m] = t.split(':').map(Number)
    const ampm = h >= 12 ? 'PM' : 'AM'
    const hour = h % 12 || 12
    return `${hour}:${String(m).padStart(2, '0')} ${ampm}`
  }
  return t
}

export function breedName(pet?: { breed?: { name?: string } | string | null } | null): string {
  if (!pet) return ''
  const b = pet.breed
  return (b && typeof b === 'object' && b.name) || (typeof b === 'string' ? b : '') || 'Pet'
}

export function ageText(pet?: { age?: number } | null): string {
  if (!pet || typeof pet.age !== 'number') return ''
  return `${pet.age} ${pet.age === 1 ? 'yr' : 'yrs'}`
}

export function petImage(pet?: { images?: string[]; species?: string } | null): string {
  if (pet && pet.images && pet.images.length && pet.images[0]) return pet.images[0]
  const cls = pet && pet.species === 'cat' ? 'cat.png' : 'dog1.png'
  return `/assets/images/my-pet/${cls}`
}