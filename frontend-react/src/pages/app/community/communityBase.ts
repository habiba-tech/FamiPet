// Community page helpers — ports of frontend/js/community.js constants and
// formatters (CATEGORY_TO_TYPE, TYPE_TO_CATEGORY, typeLabel/typeTagClass,
// mapPost, formatTime, storage helpers). escapeHTML is unnecessary in React
// (JSX escapes by default). The post "type" derives from the backend category;
// tabs, search and stats all work on that mapped type exactly like Vanilla —
// including the Vanilla quirk that a "Question" post is saved as category
// `general` (TYPE_TO_CATEGORY), so it re-reads as a Discussion.

import type { CommunityComment, CommunityPost } from '../../../api/community'
import { API_BASE } from '../../../api/client'

export const CATEGORY_TO_TYPE: Record<string, string> = {
  general: 'discussion',
  'pet-care': 'tip',
  adoption: 'story',
  'lost-found': 'discussion',
  health: 'tip',
  training: 'tip',
  other: 'discussion',
}

export const TYPE_TO_CATEGORY: Record<string, string> = {
  discussion: 'general',
  story: 'adoption',
  question: 'general',
  tip: 'pet-care',
}

const TYPE_LABELS: Record<string, string> = {
  discussion: 'Discussion',
  story: 'Story',
  question: 'Question',
  tip: 'Tips & Advice',
}

export const FILTER_TABS: { value: string; label: string }[] = [
  { value: 'all', label: 'All Posts' },
  { value: 'discussion', label: 'Discussions' },
  { value: 'story', label: 'Stories' },
  { value: 'question', label: 'Questions' },
  { value: 'tip', label: 'Tips & Advice' },
]

export function typeLabel(type: string): string {
  return TYPE_LABELS[type] || 'Discussion'
}

export function typeTagClass(type: string): string {
  if (type === 'story') return 'purple-tag'
  if (type === 'question') return 'pink-tag'
  return 'green-tag'
}

export interface PostCommentView {
  user: string
  text: string
  createdAt: number
}

export interface PostView {
  id: string
  type: string
  user: string
  avatar: string
  title: string
  content: string
  image: string
  createdAt: number
  likesCount: number
  liked: boolean
  ownerId: string | null
  isOwner: boolean
  comments: PostCommentView[]
}

export const FALLBACK_AVATAR = '/assets/images/dashboard/user-profile.svg'

// Resolve backend-relative upload paths (/uploads/...) to the API origin so
// <img> renders them; absolute URLs (cloudinary/localhost) pass through.
export function assetUrl(src: string | null | undefined): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('/uploads/')) return API_BASE.replace(/\/api$/, '') + src
  return src
}

function authorId(post: CommunityPost): string | null {
  const u = post.user
  if (u && typeof u === 'object' && u._id) return u._id
  return null
}

// Mirrors Vanilla mapPost().
export function toPostView(post: CommunityPost, currentUserId: string | undefined): PostView {
  const user = post.user
  const author = authorId(post)
  const likesArr = Array.isArray(post.likes) ? post.likes : []
  const commentsArr: PostCommentView[] = Array.isArray(post.comments)
    ? post.comments.map((c: CommunityComment) => ({
        user: (c.user && typeof c.user === 'object' && (c.user.name || c.user.email)) || 'User',
        text: c.text || '',
        createdAt: new Date(c.createdAt || Date.now()).getTime() || Date.now(),
      }))
    : []
  const name = (user && typeof user === 'object' && (user.name || user.email)) || 'Community Member'
  return {
    id: post._id || '',
    type: CATEGORY_TO_TYPE[post.category || ''] || 'discussion',
    user: name,
    avatar: (user && typeof user === 'object' && user.avatar) || FALLBACK_AVATAR,
    title: post.title || 'Untitled Post',
    content: post.content || '',
    image: post.image || '',
    createdAt: new Date(post.createdAt || Date.now()).getTime() || Date.now(),
    likesCount: likesArr.length,
    liked: likesArr.some((u) => (u && typeof u === 'object' ? u._id : u) === currentUserId),
    ownerId: author,
    isOwner: !!(author && author === currentUserId),
    comments: commentsArr,
  }
}

// Vanilla formatTime(): relative timestamps.
export function relativeTime(ts: number): string {
  const seconds = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  if (seconds < 60) return 'Just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

// Vanilla applyFilters() matched each card against raw textContent; the search
// equivalent here covers the same fields React renders.
export function postSearchText(p: PostView): string {
  return `${p.user} ${p.title} ${p.content} ${typeLabel(p.type)} Pet Care`.toLowerCase()
}

/* ---------------- LOCAL COUNTERS (parity keys) ---------------- */

export const SHARES_KEY = 'annCommunityShares'
export const GROUPS_KEY = 'annCommunityGroups'

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export function getShareCounts(): Record<string, number> {
  return readJson<Record<string, number>>(SHARES_KEY, {})
}

export function incrementShare(postId: string): number {
  const shares = getShareCounts()
  shares[postId] = (shares[postId] || 0) + 1
  localStorage.setItem(SHARES_KEY, JSON.stringify(shares))
  return shares[postId]
}

export function getJoinedGroups(): Record<string, boolean> {
  return readJson<Record<string, boolean>>(GROUPS_KEY, {})
}

export function toggleGroupMembership(group: string): boolean {
  const groups = getJoinedGroups()
  groups[group] = !groups[group]
  localStorage.setItem(GROUPS_KEY, JSON.stringify(groups))
  return groups[group]
}

/* ---------------- STATIC RIGHT-SIDEBAR CONTENT (parity) ---------------- */

// Popular Groups + the tips card are static page content (groups have no
// backend source in this app) — kept as-is, exactly as on the Vanilla page.
export const GROUPS = [
  { emoji: '🐶', name: 'Dog Lovers Club', members: '845 members' },
  { emoji: '🐱', name: 'Cat Parents', members: '623 members' },
  { emoji: '🐕', name: 'Puppy Training Tips', members: '512 members' },
  { emoji: '🩺', name: 'Pet Health Support', members: '478 members' },
]

export const TIPS_TEXT = 'Introduce new pets slowly and always supervise their first interactions.'