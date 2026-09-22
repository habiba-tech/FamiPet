// Admin Community — parity with frontend/admin/community.html +
// js/admin-community.js: review community posts (`GET /admin/community`),
// publish/unpublish (`PUT /admin/community/:id/status {isActive}`) and delete
// (`DELETE /admin/community/:id`). All admin-only on the backend.

import { useEffect, useState } from 'react'
import {
  deleteCommunityPost,
  getAllCommunityPosts,
  updateCommunityPostStatus,
  type AdminCommunityPost,
} from '../../api/admin'
import { Icon } from '../../components/shared/Icon'
import { AdminTableEmpty, AdminTopbar } from './AdminTopbar'

export function AdminCommunityPage() {
  const [posts, setPosts] = useState<AdminCommunityPost[] | null>(null)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const load = () => {
    setError('')
    getAllCommunityPosts()
      .then((res) => setPosts(res.posts || []))
      .catch((err) => {
        setPosts([])
        setError((err instanceof Error && err.message) || 'Could not load posts.')
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(''), 3000)
    return () => clearTimeout(t)
  }, [message])

  const authorName = (p: AdminCommunityPost) =>
    p.user && typeof p.user === 'object' ? p.user.name || 'Unknown' : 'Unknown'
  const authorEmail = (p: AdminCommunityPost) =>
    p.user && typeof p.user === 'object' ? p.user.email || '' : ''

  const toggleActive = async (p: AdminCommunityPost) => {
    const isActive = !p.isActive
    const verb = isActive ? 'Publish' : 'Unpublish'
    if (!window.confirm(`${verb} this post?`)) return
    try {
      const res = await updateCommunityPostStatus(p._id, isActive)
      setIsError(false)
      setMessage(res.message || `Post ${verb.toLowerCase()}ed.`)
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not update the post.')
    }
  }

  const confirmDelete = async (p: AdminCommunityPost) => {
    if (!window.confirm('Delete this post permanently?')) return
    try {
      await deleteCommunityPost(p._id)
      setIsError(false)
      setMessage('Post deleted.')
      load()
    } catch (err) {
      setIsError(true)
      setMessage((err instanceof Error && err.message) || 'Could not delete the post.')
    }
  }

  return (
    <>
      <AdminTopbar title="Community Posts" subtitle="Review, publish and remove community posts." emoji="💬" />

      <section className="admin-card">
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Author</th>
                <th>Title</th>
                <th>Category</th>
                <th>Post</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts === null && !error ? (
                <tr>
                  <td colSpan={6} className="admin-loading">
                    Loading posts...
                  </td>
                </tr>
              ) : error ? (
                <AdminTableEmpty icon="triangle-exclamation" message={error} colSpan={6} />
              ) : !(posts || []).length ? (
                <AdminTableEmpty icon="comments" message="No community posts yet." colSpan={6} />
              ) : (
                (posts || []).map((p) => (
                  <tr key={p._id}>
                    <td>
                      <strong>{authorName(p)}</strong>
                      <div className="admin-muted">{authorEmail(p)}</div>
                    </td>
                    <td>
                      <strong>{p.title || 'Untitled'}</strong>
                    </td>
                    <td>
                      <span className="pill lavender">{p.category || 'General'}</span>
                    </td>
                    <td className="admin-reason">{p.content || ''}</td>
                    <td>
                      <span className={`pill ${p.isActive ? 'green' : 'gray'}`}>
                        {p.isActive ? 'Active' : 'Hidden'}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className={`admin-btn-sm ${p.isActive ? 'btn-reject' : 'btn-approve'}`}
                        onClick={() => void toggleActive(p)}
                      >
                        {p.isActive ? 'Unpublish' : 'Publish'}
                      </button>{' '}
                      <button
                        type="button"
                        className="admin-btn-sm btn-danger"
                        onClick={() => void confirmDelete(p)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {message && (
        <div className={`admin-toast${isError ? ' error' : ''}`}>
          <i>
            <Icon name={isError ? 'triangle-exclamation' : 'circle-check'} />
          </i>
          <span>{message}</span>
        </div>
      )}
    </>
  )
}