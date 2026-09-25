// Compose post modal — port of the Vanilla create-post modal (openPostModal /
// publishPost). Delta: the `.modal-user` shows the real logged-in user from
// famipetUser (Vanilla hardcoded "Mahek Shaikh"); validation feedback renders
// as an inline error instead of an error toast. Title is optional and defaults
// to the type label, exactly as Vanilla.

import { useEffect, useRef, useState } from 'react'
import { createCommunityPost } from '../../../api/community'
import { getUser } from '../../../api/client'
import { Icon } from '../../../components/shared/Icon'
import {
  assetUrl,
  FALLBACK_AVATAR,
  TYPE_TO_CATEGORY,
  typeLabel,
} from './communityBase'

interface ComposePostModalProps {
  initialType: string
  onClose: () => void
  onPublished: (message: string) => void
}

export function ComposePostModal({ initialType, onClose, onPublished }: ComposePostModalProps) {
  const [type, setType] = useState(initialType || 'discussion')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const user = getUser()
  const userName = user?.name || 'Pet Parent'

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

  const resetImage = () => {
    setImageFile(null)
    setPreview('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
  }

  const publish = async () => {
    const text = content.trim()
    if (!text) {
      setError('Please write something before publishing.')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = new FormData()
      payload.append('title', title.trim() || typeLabel(type))
      payload.append('content', text)
      payload.append('category', TYPE_TO_CATEGORY[type] || 'general')
      if (imageFile) payload.append('image', imageFile)
      await createCommunityPost(payload)
      onPublished('Your post was published successfully!')
    } catch (err) {
      setError((err instanceof Error && err.message) || 'Could not publish your post.')
      setSaving(false)
    }
  }

  return (
    <div
      className="post-modal-overlay show"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="post-modal">
        <div className="post-modal-header">
          <div>
            <h2>Create a Community Post</h2>
            <p>Share something with your fellow pet parents.</p>
          </div>
          <button className="modal-close-btn" type="button" aria-label="Close" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>

        <div className="modal-user">
          <img src={assetUrl(user?.avatar) || FALLBACK_AVATAR} alt={userName} />
          <div>
            <strong>{userName}</strong>
            <span>Pet Parent</span>
          </div>
        </div>

        <label className="modal-label" htmlFor="modalPostTitle">
          Title
        </label>
        <input
          id="modalPostTitle"
          className="modal-input"
          maxLength={100}
          placeholder="Give your post a title..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <label className="modal-label" htmlFor="modalPostType">
          Post Type
        </label>
        <select id="modalPostType" className="modal-input" value={type} onChange={(e) => setType(e.target.value)}>
          <option value="discussion">Discussion</option>
          <option value="story">Story</option>
          <option value="question">Question</option>
          <option value="tip">Tips & Advice</option>
        </select>

        <label className="modal-label" htmlFor="modalPostContent">
          Your post
        </label>
        <textarea
          id="modalPostContent"
          className="modal-textarea"
          maxLength={1000}
          placeholder="What's on your mind about your furry friend?"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />

        <div className="modal-photo-area">
          <label className="modal-photo-btn" htmlFor="postImageInput">
            <Icon name="image" />
            Add Photo
          </label>
          <input
            ref={fileRef}
            id="postImageInput"
            type="file"
            accept="image/*"
            hidden
            onChange={onFileChange}
          />
          <button
            className={`remove-photo-btn${preview ? '' : ' hidden'}`}
            type="button"
            onClick={resetImage}
          >
            <Icon name="x" />
            Remove
          </button>
        </div>

        <div className={`post-image-preview${preview ? '' : ' hidden'}`}>
          {preview && <img src={preview} alt="Selected post image" />}
        </div>

        {error && <p className="modal-error">{error}</p>}

        <div className="post-modal-actions">
          <button className="cancel-modal-btn" type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="publish-post-btn" type="button" disabled={saving} onClick={publish}>
            <Icon name="send" />
            {saving ? 'Publishing...' : 'Publish Post'}
          </button>
        </div>
      </div>
    </div>
  )
}