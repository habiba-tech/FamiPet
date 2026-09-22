// Admin page topbar — parity with the Vanilla admin pages' `header.admin-topbar`
// (title + emoji + subtitle + user chip). Each page renders its own topbar
// inside `main.admin-main`, exactly like the Vanilla pages.

import { API_BASE, getUser } from '../../api/client'
import { Icon } from '../../components/shared/Icon'

const DEFAULT_AVATAR = '/assets/images/dashboard/user-profile.svg'

// Resolve backend-relative upload paths (/uploads/...) to the API origin so the
// chip <img> renders them; absolute URLs pass through. The bundled placeholder
// SVG is never a user's actual avatar (SettingsPage parity).
function topbarAvatar(value: string | null | undefined): string {
  if (value && !String(value).includes('user-profile.svg')) {
    if (value.startsWith('/uploads/')) return API_BASE.replace(/\/api$/, '') + value
    return value
  }
  return DEFAULT_AVATAR
}

export function AdminTopbar({ title, subtitle, emoji = '🌸' }: { title: string; subtitle: string; emoji?: string }) {
  const user = getUser()
  return (
    <header className="admin-topbar">
      <div>
        <h2>
          {title} <span>{emoji}</span>
        </h2>
        <p>{subtitle}</p>
      </div>
      <div className="admin-actions">
        <div className="admin-user-chip">
          <img src={topbarAvatar(user?.avatar)} alt="Admin" />
          <div>
            <strong>{user?.name || 'Admin'}</strong>
            <small>Administrator</small>
          </div>
        </div>
      </div>
    </header>
  )
}

// Row markup used by every admin table's loading / empty / error states.
// `admin-empty` rows span all columns with an icon + message (Vanilla parity).
export function AdminTableEmpty({ icon, message, colSpan }: { icon: string; message: string; colSpan: number }) {
  return (
    <tr>
      <td colSpan={colSpan} className="admin-empty">
        <i>
          <Icon name={icon} />
        </i>
        <p>{message}</p>
      </td>
    </tr>
  )
}