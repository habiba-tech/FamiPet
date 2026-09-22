// Comments modal — port of the Vanilla comments modal (openComments /
// renderComments / addComment). There is no per-comment delete in the Vanilla
// UI (the backend DELETE /comments/:commentId route is unused by the page), so
// none is added here.

import { useEffect, useState } from 'react'
import { Icon } from '../../../components/shared/Icon'
import { relativeTime, type PostView } from './communityBase'

interface CommentsModalProps {
  post: PostView
  onSend: (text: string) => Promise<boolean>
  onNotify: (message: string) => void
  onClose: () => void
}

export function CommentsModal({ post, onSend, onNotify, onClose }: CommentsModalProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  const send = async () => {
    const value = text.trim()
    if (!value) {
      onNotify('Please write a comment first.')
      return
    }
    if (sending) return
    setSending(true)
    const ok = await onSend(value)
    setSending(false)
    if (ok) setText('')
  }

  return (
    <div
      className="post-modal-overlay show"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="post-modal comments-modal">
        <div className="post-modal-header">
          <div>
            <h2>Comments</h2>
            <p>{post.title}</p>
          </div>
          <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="comments-list">
          {post.comments.length === 0 ? (
            <div className="no-comments">
              <Icon name="comments" />
              <p>No comments yet.</p>
              <small>Be the first to join the conversation!</small>
            </div>
          ) : (
            post.comments.map((comment, i) => (
              <div className="comment-item" key={`${comment.createdAt}-${i}`}>
                <strong>{comment.user}</strong>
                <p>{comment.text}</p>
                <small>{relativeTime(comment.createdAt)}</small>
              </div>
            ))
          )}
        </div>

        <div className="comment-composer">
          <input
            type="text"
            maxLength={300}
            placeholder="Write a comment..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') send()
            }}
          />
          <button type="button" disabled={sending} onClick={send} aria-label="Add comment">
            <Icon name="send" />
          </button>
        </div>
      </div>
    </div>
  )
}