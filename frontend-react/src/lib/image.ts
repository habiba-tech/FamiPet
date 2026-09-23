// Image/asset URL resolution — the single place that decides how backend media
// URLs are turned into renderable <img>/src values. Parity with api.js/page JS:
//   - relative `/uploads/...` paths resolve against the API origin (multer
//     stores media above the `/api` mount point),
//   - absolute URLs (http(s)://... — localhost, Cloudinary) pass through,
//   - anything else (bundled asset paths) passes through unchanged.

import { apiOrigin } from '../api/client'

export function assetUrl(src: string | null | undefined): string {
  if (!src) return ''
  if (src.startsWith('http://') || src.startsWith('https://')) return src
  if (src.startsWith('/uploads/')) return apiOrigin() + src
  return src
}