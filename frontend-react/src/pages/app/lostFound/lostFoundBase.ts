// Lost & Found page helpers — ports of frontend/js/lost-found.js constants and
// formatters (titleCaseGender, normalizeLocation, formatDate, mapReport,
// FALLBACK image fallback, filter option lists). escapeHTML is unnecessary in
// React (JSX escapes by default). Ownership (edit/delete on own reports) is
// derived from the populated report.user._id (backend still enforces it — a
// foreign report's PUT/DELETE returns 403).

import type { LostFoundReport } from '../../../api/lostFound'
import { API_BASE } from '../../../api/client'

// Vanilla mapReport() card fallback image (the app's own asset).
export const FALLBACK_IMAGE = '/assets/images/adoption/pet1.jpg'

export const FILTER_TABS = [
  { value: 'all', label: 'All' },
  { value: 'lost', label: 'Lost Pets' },
  { value: 'found', label: 'Found Pets' },
]

export const TYPE_OPTIONS = [
  { value: 'all', label: 'All Types' },
  { value: 'dog', label: 'Dogs' },
  { value: 'cat', label: 'Cats' },
  { value: 'other', label: 'Other' },
]

export const LOCATION_OPTIONS = [
  { value: 'all', label: 'All Locations' },
  { value: 'andheri', label: 'Andheri' },
  { value: 'borivali', label: 'Borivali' },
  { value: 'thane', label: 'Thane' },
  { value: 'dadar', label: 'Dadar' },
]

export const SORT_OPTIONS = [
  { value: 'recent', label: 'Sort: Recent' },
  { value: 'oldest', label: 'Sort: Oldest' },
  { value: 'name', label: 'Sort: Name' },
]

// Resolve backend-relative upload paths (/uploads/...) to the API origin so
// <img> renders them; absolute URLs (localhost/cloudinary) pass through.
export function assetUrl(src: string | null | undefined): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('/uploads/')) return API_BASE.replace(/\/api$/, '') + src
  return src
}

export function titleCaseGender(gender?: string): string {
  const value = String(gender || '').toLowerCase()
  if (value === 'male') return 'Male'
  if (value === 'female') return 'Female'
  return 'Prefer not to say'
}

// Vanilla normalizeLocation(): maps a free-text location to one of the four
// filter buckets (or "all" for anything else).
export function normalizeLocation(value: string): string {
  const location = value.toLowerCase().trim()
  if (location.includes('andheri')) return 'andheri'
  if (location.includes('borivali')) return 'borivali'
  if (location.includes('thane')) return 'thane'
  if (location.includes('dadar')) return 'dadar'
  return 'all'
}

// Vanilla formatDate(): "3 Sep 2026" (en-IN).
export function formatDate(date?: string): string {
  if (!date) return 'Unknown date'
  const parsed = new Date(date)
  if (Number.isNaN(parsed.getTime())) return date
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

// Mirror of Vanilla mapReport(): the card renders gender, breed-or-
// "Not specified" in the middle slot (Vanilla labeled it `age`, but the
// backend has no age field — the breed is the real value displayed), and
// color, exactly as the Vanilla grid rendered real reports.
export interface ReportView {
  id: string
  kind: 'lost' | 'found'
  species: string
  petName: string
  breed: string
  gender: string
  genderValue: string
  genderIcon: string
  color: string
  description: string
  location: string
  locationBucket: string
  dateLabel: string
  date: string
  dateDisplay: string
  contactName: string
  contactPhone: string
  poster: string
  phone: string
  email: string
  image: string
  isOwner: boolean
}

export function toReportView(report: LostFoundReport, currentUserId: string | undefined): ReportView {
  const images = Array.isArray(report.images) ? report.images : []
  const author = report.user && typeof report.user === 'object' ? report.user : {}
  const authorId = typeof report.user === 'object' ? report.user?._id : undefined
  const kind = report.type === 'found' ? 'found' : 'lost'
  return {
    id: report._id,
    kind,
    species: report.species || '',
    petName: report.petName || 'Pet',
    breed: report.breed || '',
    gender: titleCaseGender(report.gender),
    genderValue: ['male', 'female'].includes(String(report.gender || '')) ? String(report.gender) : 'unknown',
    genderIcon: report.gender === 'female' ? 'venus' : report.gender === 'male' ? 'mars' : 'paw',
    color: report.color || '',
    description: report.description || '',
    location: report.location || '',
    locationBucket: normalizeLocation(report.location || ''),
    dateLabel: kind === 'lost' ? 'Lost on' : 'Found on',
    date: report.date ? new Date(report.date).toISOString().slice(0, 10) : '',
    dateDisplay: formatDate(report.date),
    contactName: report.contactName || '',
    contactPhone: report.contactPhone || '',
    poster: report.contactName || author.name || 'Pet Parent',
    phone: report.contactPhone || author.phone || '',
    email: author.email || '',
    image: assetUrl(images[0]) || FALLBACK_IMAGE,
    isOwner: !!(currentUserId && authorId && authorId === currentUserId),
  }
}

// Vanilla renderCards() matched each card against its innerText + data-name;
// the React equivalent covers the same fields referenced on the card.
export function reportSearchText(r: ReportView): string {
  return `${r.petName} ${r.breed} ${r.gender} ${r.color} ${r.description} ${r.location}`.toLowerCase()
}