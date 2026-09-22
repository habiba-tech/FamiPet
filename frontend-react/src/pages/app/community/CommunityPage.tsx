// Phase 15 Community — React port of frontend/pages/community.html +
// frontend/js/community.js.
//
// Deltas from the Vanilla page (documented in migration.md):
// - Like uses POST /community/:id/like — the backend's only route. Vanilla
//   called PUT, which the backend never served (like counters only looked right
//   on the 2 hardcoded demo cards).
// - Stats are computed from the real feed (Members = unique authors, Posts =
//   total, Discussions/Stories = mapped types). Vanilla hardcoded 1,248/24/156/89
//   with no updating code (AGENTS §5).
// - Notification bell shows real /notifications (Vanilla hardcoded a "3" badge
//   + a static fake panel — AGENTS §7). No "Report Post" action (it only toasted
//   a fake message; no backend endpoint). The compose modal + toolbar avatar use
//   the logged-in user instead of the hardcoded "Mahek Shaikh".
// - Toast: single page toast for success/errors (React convention from Phases
//   10-14) instead of the Vanilla ann-toast stack/alert()s.

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  addCommunityComment,
  deleteCommunityPost,
  getCommunityPosts,
  toggleCommunityLike,
} from '../../../api/community'
import { getUser } from '../../../api/client'
import {
  getNotifications,
  markAllNotificationsRead,
  type AppNotification,
} from '../../../api/notifications'
import { Icon } from '../../../components/shared/Icon'
import { CommentsModal } from './CommentsModal'
import { ComposePostModal } from './ComposePostModal'
import { PostCard } from './PostCard'
import {
  assetUrl,
  FALLBACK_AVATAR,
  FILTER_TABS,
  getJoinedGroups,
  getShareCounts,
  GROUPS,
  incrementShare,
  postSearchText,
  TIPS_TEXT,
  toggleGroupMembership,
  toPostView,
  type PostView,
} from './communityBase'

export function CommunityPage() {
  const currentUser = getUser()
  const currentUserId = currentUser?.id

  const [posts, setPosts] = useState<PostView[] | null>(null)
  const [loadFailed, setLoadFailed] = useState(false)
  const [query, setQuery] = useState('')
  const [activeFilter, setActiveFilter] = useState('all')
  const [shareCounts, setShareCounts] = useState<Record<string, number>>(() => getShareCounts())
  const [joined, setJoined] = useState<Record<string, boolean>>(() => getJoinedGroups())
  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const [message, setMessage] = useState('')
  const [composeOpen, setComposeOpen] = useState(false)
  const [composeType, setComposeType] = useState('discussion')
  const [commentsPost, setCommentsPost] = useState<PostView | null>(null)

  const bellRef = useRef<HTMLButtonElement>(null)

  const load = () => {
    setLoadFailed(false)
    Promise.all([getCommunityPosts(), getNotifications()])
      .then(([res, notesRes]) => {
        setPosts((res.posts || []).map((p) => toPostView(p, currentUserId)))
        setNotifications(notesRes.notifications || [])
      })
      .catch(() => {
        setPosts([])
        setNotifications([])
        setLoadFailed(true)
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  // Toast — same auto-dismiss behavior as the reminders/appointments pages.
  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 2500)
    return () => clearTimeout(t)
  }, [message])

  // click outside closes the notification panel
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (bellRef.current?.contains(e.target as Node)) return
      setPanelOpen(false)
    }
    if (panelOpen) {
      document.addEventListener('click', onDocClick)
      return () => document.removeEventListener('click', onDocClick)
    }
    return undefined
  }, [panelOpen])

  const unread = (notifications || []).filter((n) => !n.isRead).length

  const markAllRead = async () => {
    setNotifications((list) => (list || []).map((n) => ({ ...n, isRead: true })))
    try {
      await markAllNotificationsRead()
    } catch {
      /* ignore — optimistic update already applied */
    }
  }

  const stats = useMemo(() => {
    const list = posts || []
    const authors = new Set(list.map((p) => p.user)).size
    return {
      members: authors,
      posts: list.length,
      discussions: list.filter((p) => p.type === 'discussion').length,
      stories: list.filter((p) => p.type === 'story').length,
    }
  }, [posts])

  const visiblePosts = useMemo(() => {
    const list = posts || []
    const search = query.trim().toLowerCase()
    return list.filter((p) => {
      const matchesType = activeFilter === 'all' || p.type === activeFilter
      const matchesSearch = !search || postSearchText(p).includes(search)
      return matchesType && matchesSearch
    })
  }, [posts, query, activeFilter])

  const visibleGroups = useMemo(() => {
    const search = query.trim().toLowerCase()
    if (!search) return GROUPS
    return GROUPS.filter((g) => `${g.name} ${g.members}`.toLowerCase().includes(search))
  }, [query])

  const handleLike = async (post: PostView) => {
    try {
      const res = await toggleCommunityLike(post.id)
      const likes = res.likes || []
      setPosts(
        (list) =>
          list?.map((p) =>
            p.id === post.id
              ? {
                  ...p,
                  likesCount: likes.length,
                  liked: likes.some((u) => (u && typeof u === 'object' ? u._id : u) === currentUserId),
                }
              : p,
          ) ?? list,
      )
    } catch (err) {
      setMessage((err instanceof Error && err.message) || 'Could not update like.')
    }
  }

  const handleShare = async (post: PostView) => {
    const shareText = `${post.title} — Famipet Community`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Famipet Community', text: shareText })
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText)
        setMessage('Post link/text copied!')
      } else {
        setMessage('Post ready to share!')
      }
    } catch {
      return // user cancelled native sharing — no counter increment (Vanilla behavior)
    }
    const count = incrementShare(post.id)
    setShareCounts((prev) => ({ ...prev, [post.id]: count }))
  }

  const handleDelete = async (post: PostView) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return
    try {
      await deleteCommunityPost(post.id)
      setPosts((list) => list?.filter((p) => p.id !== post.id) ?? list)
      setMessage('Post deleted successfully.')
    } catch (err) {
      setMessage((err instanceof Error && err.message) || 'Could not delete post.')
    }
  }

  const handleSendComment = async (text: string): Promise<boolean> => {
    const target = commentsPost
    if (!target) return false
    try {
      await addCommunityComment(target.id, text)
      const comment = { user: currentUser?.name || 'Pet Parent', text, createdAt: Date.now() }
      const updated = (p: PostView) => (p.id === target.id ? { ...p, comments: [...p.comments, comment] } : p)
      setPosts((list) => list?.map(updated) ?? list)
      setCommentsPost((cur) => (cur ? { ...cur, comments: [...cur.comments, comment] } : cur))
      setMessage('Comment added successfully.')
      return true
    } catch (err) {
      setMessage((err instanceof Error && err.message) || 'Could not add comment.')
      return false
    }
  }

  const openCompose = (type: string) => {
    setComposeType(type)
    setComposeOpen(true)
  }

  const handlePublished = async (msg: string) => {
    setComposeOpen(false)
    setMessage(msg)
    try {
      const res = await getCommunityPosts()
      setPosts((res.posts || []).map((p) => toPostView(p, currentUserId)))
    } catch {
      /* keep current list; success toast already shown */
    }
  }

  const handleGroupJoin = (name: string) => {
    const joinedNow = toggleGroupMembership(name)
    setJoined((prev) => ({ ...prev, [name]: joinedNow }))
    setMessage(joinedNow ? `Joined ${name}!` : `Left ${name}.`)
  }

  if (loadFailed && !posts) {
    return (
      <div className="community-page">
        <div className="community-state">
          <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
          <div style={{ marginTop: 8 }}>Could not load the community feed.</div>
          <button type="button" className="retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const profileAvatar = assetUrl(currentUser?.avatar) || FALLBACK_AVATAR
  const profileName = currentUser?.name || 'Pet Parent'

  return (
    <div className="community-page">
      <header className="page-header">
        <div className="header-title">
          <h1>
            Community <span>♥</span>
          </h1>
          <p>Connect, share and learn with fellow pet lovers. 🐾</p>
        </div>

        <div className="header-actions">
          <div className="search-box">
            <input
              type="text"
              placeholder="Search posts, people, groups..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Icon name="magnifying-glass" />
          </div>

          <div className="notification-wrapper">
            <button
              ref={bellRef}
              className="notification-btn"
              type="button"
              aria-label="Notifications"
              aria-expanded={panelOpen}
              onClick={() => setPanelOpen((o) => !o)}
            >
              <Icon name="bell" />
              <span className="badge" style={{ display: unread ? 'flex' : 'none' }}>
                {unread}
              </span>
            </button>

            <div className={`notification-panel${panelOpen ? ' open' : ''}`}>
              <div className="notification-panel-header">
                <div>
                  <strong>Notifications</strong>
                  <span>{unread === 1 ? '1 unread' : unread + ' unread'}</span>
                </div>
                <button type="button" onClick={markAllRead}>
                  Mark all read
                </button>
              </div>
              <div className="notification-list">
                {!notifications || notifications.length === 0 || unread === 0 ? (
                  <div className="notification-empty">You&apos;re all caught up!</div>
                ) : (
                  notifications.map((n) => (
                    <div className={`notification-item${n.isRead ? ' read' : ''}`} key={n._id}>
                      <span className="notification-dot" />
                      <div>
                        <strong>{n.title || ''}</strong>
                        <p>{n.message || ''}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <button className="new-post-btn" type="button" onClick={() => openCompose('discussion')}>
            <Icon name="plus" /> New Post
          </button>
        </div>
      </header>

      <section className="community-stats">
        <div className="stat-card purple">
          <div className="stat-icon">
            <Icon name="users-round" />
          </div>
          <div>
            <span>Members</span>
            <strong>{stats.members.toLocaleString()}</strong>
            <small>Active community</small>
          </div>
        </div>

        <div className="stat-card green">
          <div className="stat-icon">
            <Icon name="note-sticky" />
          </div>
          <div>
            <span>Posts</span>
            <strong>{stats.posts.toLocaleString()}</strong>
            <small>Total community posts</small>
          </div>
        </div>

        <div className="stat-card orange">
          <div className="stat-icon">
            <Icon name="comments" />
          </div>
          <div>
            <span>Discussions</span>
            <strong>{stats.discussions.toLocaleString()}</strong>
            <small>Community discussions</small>
          </div>
        </div>

        <div className="stat-card pink">
          <div className="stat-icon">
            <Icon name="heart" />
          </div>
          <div>
            <span>Stories Shared</span>
            <strong>{stats.stories.toLocaleString()}</strong>
            <small>This month</small>
          </div>
        </div>
      </section>

      <div className="community-layout">
        <section className="community-feed">
          <div className="create-post">
            <div className="profile-small">
              <img src={profileAvatar} alt={profileName} />
            </div>

            <div className="post-input-area">
              <input type="text" defaultValue="" placeholder="What's on your mind about your furry friend?" />

              <div className="post-tools">
                <button type="button" className="tool-btn photo" onClick={() => openCompose('discussion')}>
                  <Icon name="image" />
                  Photo/Video
                </button>

                <button type="button" className="tool-btn question" onClick={() => openCompose('question')}>
                  <Icon name="circle-question" />
                  Ask Question
                </button>

                <button type="button" className="tool-btn story" onClick={() => openCompose('story')}>
                  <Icon name="heart" />
                  Share Story
                </button>

                <button type="button" className="post-btn" onClick={() => openCompose('discussion')}>
                  Post
                </button>
              </div>
            </div>
          </div>

          <div className="post-tabs">
            {FILTER_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                className={`tab${activeFilter === tab.value ? ' active' : ''}`}
                onClick={() => setActiveFilter(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="posts-container">
            {posts === null ? (
              <div className="community-load-state">
                <Icon name="circle-notch" spin />
                <span>Loading community posts...</span>
              </div>
            ) : visiblePosts.length === 0 ? (
              <div className="no-posts">
                <Icon name="face-frown" />
                <p>No matching posts found.</p>
              </div>
            ) : (
              visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  shareCount={shareCounts[post.id] || 0}
                  onLike={handleLike}
                  onComment={(p) => setCommentsPost(p)}
                  onShare={handleShare}
                  onDelete={handleDelete}
                />
              ))
            )}
          </div>
        </section>

        <aside className="community-right">
          <div className="right-card">
            <div className="right-card-header">
              <h2>Popular Groups</h2>
              <button type="button">View All</button>
            </div>

            <div className="groups-list">
              {visibleGroups.map((g) => {
                const isJoined = joined[g.name]
                return (
                  <div className="group-item" key={g.name}>
                    <div className="group-image">{g.emoji}</div>
                    <div className="group-info">
                      <strong>{g.name}</strong>
                      <span>{g.members}</span>
                    </div>
                    <button
                      type="button"
                      className={`join-btn${isJoined ? ' joined' : ''}`}
                      onClick={() => handleGroupJoin(g.name)}
                    >
                      {isJoined ? 'Joined' : 'Join'}
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          <div className="tips-card">
            <div className="tips-header">
              <h2>Helpful Tips</h2>
              <span>🐾</span>
            </div>
            <p>{TIPS_TEXT}</p>
            <div className="tips-animals">🐕 🐈</div>
          </div>
        </aside>
      </div>

      {message && (
        <div className="community-message show">
          <div className="message-icon">
            <Icon name="check" />
          </div>
          <span>{message}</span>
        </div>
      )}

      {composeOpen && (
        <ComposePostModal
          initialType={composeType}
          onClose={() => setComposeOpen(false)}
          onPublished={handlePublished}
        />
      )}

      {commentsPost && (
        <CommentsModal
          post={commentsPost}
          onSend={handleSendComment}
          onNotify={setMessage}
          onClose={() => setCommentsPost(null)}
        />
      )}
    </div>
  )
}