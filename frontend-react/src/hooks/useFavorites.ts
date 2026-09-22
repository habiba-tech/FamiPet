// Favorite state for the current user — parity with the Vanilla pattern in
// frontend/js/dashboard-data.js + frontend/js/adoption.js:
//   initial liked ids come from GET /auth/me (user.favorites),
//   toggle via POST /users/favorites/:petId → { success, favorites, isFavorite }.
// Optimistic flip with rollback on failure (dashboard.js `setFavoriteState` parity).

import { useCallback, useEffect, useState } from 'react'
import { getMe } from '../api/auth'
import { toggleFavorite } from '../api/favorites'

export function useFavorites() {
  const [favIds, setFavIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    getMe()
      .then((r) => {
        if (cancelled) return
        const favs = (r.user?.favorites as Array<{ _id?: string } | string> | undefined) || []
        setFavIds(new Set(favs.map((f) => String(typeof f === 'string' ? f : f._id ?? '')).filter(Boolean)))
      })
      .catch(() => {}) // favorites stay empty (dashboard-data.js parity)
    return () => {
      cancelled = true
    }
  }, [])

  const toggle = useCallback(async (petId: string, previouslyLiked: boolean) => {
    const flip = (d: Set<string>, liked: boolean) => {
      const next = new Set(d)
      if (liked) next.add(petId)
      else next.delete(petId)
      return next
    }
    setFavIds((d) => flip(d, !previouslyLiked))
    try {
      const res = await toggleFavorite(petId)
      if (typeof res.isFavorite === 'boolean') {
        const liked = res.isFavorite
        setFavIds((d) => flip(d, liked))
      }
    } catch {
      setFavIds((d) => flip(d, previouslyLiked))
    }
  }, [])

  return { favIds, toggle }
}