// Post card — port of Vanilla createPostElement() + attachLikeButton/
// attachCommentButton/attachShareButton/attachMoreButton. Unlike Vanilla there
// is no "Report Post" action (it only toasted a fake message; there is no
// backend report endpoint — AGENTS §5), so the more menu exists on own posts
// only and offers Delete.

import { useEffect, useRef, useState } from 'react'
import { Icon } from '../../../components/shared/Icon'
import { assetUrl, FALLBACK_AVATAR, relativeTime, typeLabel, typeTagClass, type PostView } from './communityBase'

interface PostCardProps {
  post: PostView
  shareCount: number
  onLike: (post: PostView) => void
  onComment: (post: PostView) => void
  onShare: (post: PostView) => void
  onDelete: (post: PostView) => void
}

export function PostCard({ post, shareCount, onLike, onComment, onShare, onDelete }: PostCardProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const cardRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) setMenuOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [menuOpen])

  return (
    <article ref={cardRef} className={`post-card${post.isOwner ? ' user-created' : ''}`} data-type={post.type}>
      <div className="post-header">
        <div className="post-user">
          <img src={assetUrl(post.avatar) || FALLBACK_AVATAR} alt={post.user} />
          <div>
            <strong>{post.user}</strong>
            <span>
              {relativeTime(post.createdAt)} • {typeLabel(post.type)}
            </span>
          </div>
        </div>

        {post.isOwner && (
          <button
            type="button"
            className="more-post"
            aria-label="More actions"
            aria-expanded={menuOpen}
            onClick={(e) => {
              e.stopPropagation()
              setMenuOpen((o) => !o)
            }}
          >
            <Icon name="ellipsis-vertical" />
          </button>
        )}

        {menuOpen && (
          <div className="post-actions-menu">
            <button
              type="button"
              className="delete-post-action"
              onClick={() => {
                setMenuOpen(false)
                onDelete(post)
              }}
            >
              <Icon name="trash-can" />
              Delete Post
            </button>
          </div>
        )}
      </div>

      <div className="post-body">
        <div className="post-content">
          <h2>{post.title}</h2>
          <p>{post.content}</p>

          <div className="post-tags">
            <span className={typeTagClass(post.type)}>{typeLabel(post.type)}</span>
            <span className="green-tag">Pet Care</span>
          </div>
        </div>

        {post.image && <img className="post-image" src={assetUrl(post.image)} alt="Post image" />}
      </div>

      <div className="post-footer">
        <button
          type="button"
          className={`like-btn${post.liked ? ' liked' : ''}`}
          aria-pressed={post.liked}
          onClick={() => onLike(post)}
        >
          <Icon name="heart" />
          <span>{post.likesCount}</span>
        </button>

        <button type="button" className="comment-btn" onClick={() => onComment(post)}>
          <Icon name="comments" />
          <span>{post.comments.length}</span>
        </button>

        <button type="button" className="share-btn" onClick={() => onShare(post)}>
          <Icon name="share" />
          <span>{shareCount}</span>
        </button>

        <span className="comments">{post.comments.length} Comments</span>
      </div>
    </article>
  )
}