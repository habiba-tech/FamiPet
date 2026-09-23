// Phase 20 Settings — React port of frontend/pages/settings.html +
// frontend/js/settings.js.
//
// Deltas from the Vanilla page (documented in migration.md):
// - All displayed values come from the real backend (AGENTS §5): profile fields
//   + account summary (role / joined / pet count) from GET /auth/me, appointment
//   count from GET /appointments, "Your Pets" list from the populated `pets`
//   array. Vanilla showed hardcoded "Mahek Shaikh", "2 Pets", Buddy/Whiskers.
// - Email is a read-only field: PUT /auth/profile only accepts
//   name/phone/address/city/avatar, so an editable email would silently not
//   persist (Vanilla bug — the email was never sent). Read-only avoids implying
//   a change happens.
// - Dark Mode preference is wired to the real theme system (useTheme) instead
//   of Vanilla's disabled "Coming soon" toggle.
// - Danger Zone "Delete Account" is dropped: there is no self-delete backend
//   endpoint, and the Vanilla button only cleared localStorage client-side
//   without deleting the account, so "permanently delete" would be fake.

import { useEffect, useRef, useState, type ChangeEvent, type Ref } from 'react'
import { Link } from 'react-router-dom'
import { changePassword, updateProfile, uploadAvatar } from '../../../api/settings'
import { getMe, type AuthUser } from '../../../api/auth'
import { getAppointments } from '../../../api/appointments'
import { getNotifications, markAllNotificationsRead, type AppNotification } from '../../../api/notifications'
import { getMyPets, type Pet } from '../../../api/pets'
import { useAuth } from '../../../hooks/useAuth'
import { useTheme } from '../../../hooks/useTheme'
import { Icon } from '../../../components/shared/Icon'
import { ageText, breedName, petImage } from '../../../lib/formatters'
import { getErrorMessage } from '../../../lib/errors'

const DEFAULT_AVATAR = '/assets/images/dashboard/user-profile.svg'

// A real avatar can be a server URL or a data URL; the bundled placeholder SVG
// is never a user's actual avatar (thinking of the Vanilla bug that stored the
// placeholder in the DB for every account that saved without a photo).
function realAvatar(value: string | null | undefined): string {
  if (value && !String(value).includes('user-profile.svg')) return value
  return DEFAULT_AVATAR
}

export function SettingsPage() {
  const { user: authUser, setUser } = useAuth()
  const { theme, toggle } = useTheme()

  /* ---------------- LOADED STATE ---------------- */

  const [loadFailed, setLoadFailed] = useState(false)
  const [profile, setProfile] = useState<AuthUser | null>(() => authUser)
  const [pets, setPets] = useState<Pet[]>([])
  const [apptCount, setApptCount] = useState<number | null>(null)

  /* ---------------- NOTIFICATION BELL ---------------- */

  const [notifications, setNotifications] = useState<AppNotification[] | null>(null)
  const [panelOpen, setPanelOpen] = useState(false)
  const bellRef = useRef<HTMLButtonElement>(null)

  /* ---------------- PROFILE FORM ---------------- */

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [location, setLocation] = useState('')
  const [avatarUrl, setAvatarUrl] = useState(DEFAULT_AVATAR)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileBtnSaved, setProfileBtnSaved] = useState(false)
  const [profileError, setProfileError] = useState('')

  const nameRef = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  /* ---------------- PASSWORD FORM ---------------- */

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [pwdVisible, setPwdVisible] = useState<Record<string, boolean>>({})
  const [pwdUpdating, setPwdUpdating] = useState(false)
  const [pwdBtnSaved, setPwdBtnSaved] = useState(false)
  const [pwdMsgs, setPwdMsgs] = useState<Record<string, string | null>>({})

  const currentPwdRef = useRef<HTMLInputElement>(null)
  const newPwdRef = useRef<HTMLInputElement>(null)
  const confirmPwdRef = useRef<HTMLInputElement>(null)

  /* ---------------- PREFERENCES (localStorage — Vanilla parity) ---------------- */

  const prefKeys = ['email', 'push', 'appointments'] as const
  const [prefs, setPrefs] = useState<Record<string, boolean>>(() => {
    const saved: Record<string, boolean> = {}
    prefKeys.forEach((k) => {
      const stored = localStorage.getItem('annSetting_' + k)
      saved[k] = stored === null ? true : stored === 'true'
    })
    return saved
  })

  const setPref = (k: (typeof prefKeys)[number], value: boolean) => {
    setPrefs((p) => ({ ...p, [k]: value }))
    localStorage.setItem('annSetting_' + k, String(value))
  }

  /* ---------------- LOAD ---------------- */

  const fillFields = (u: AuthUser) => {
    setName(u.name || '')
    setEmail(u.email || '')
    setPhone(u.phone || '')
    setLocation(u.city || u.address || '')
    setAvatarUrl(realAvatar(u.avatar))
    setAvatarFile(null)
  }

  const load = () => {
    setLoadFailed(false)
    Promise.all([getMe(), getNotifications(), getAppointments(), getMyPets()])
      .then(([meRes, notesRes, apptRes, petsRes]) => {
        const u = meRes.user as AuthUser | undefined
        if (u) {
          fillFields(u)
          setProfile(u)
        } else if (authUser) {
          fillFields(authUser)
        }
        setNotifications(notesRes.notifications || [])
        const scheduled = (apptRes.appointments || []).filter((a) => a.status === 'scheduled').length
        setApptCount(scheduled)
        setPets(petsRes.pets || [])
      })
      .catch(() => {
        setNotifications([])
        if (authUser) {
          fillFields(authUser)
        } else {
          setLoadFailed(true)
        }
      })
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])

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

  /* ---------------- PROFILE SAVE ---------------- */

  const onAvatarChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      e.target.value = ''
      return
    }
    setAvatarFile(file)
    setAvatarUrl(URL.createObjectURL(file))
  }

  const saveProfile = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      nameRef.current?.focus()
      return
    }
    setProfileSaving(true)
    setProfileSaved(false)
    setProfileError('')
    try {
      let avatar = avatarUrl
      if (avatarFile) {
        const up = await uploadAvatar(avatarFile)
        avatar = up.avatar || avatar
        setAvatarFile(null)
      }
      // The default placeholder must never be persisted as the user's avatar
      // (Vanilla bug) — only real uploaded/server avatars are saved.
      const persistedAvatar =
        avatar.startsWith('data:') || avatar.includes('user-profile.svg') ? '' : avatar
      const res = await updateProfile({
        name: trimmedName,
        phone: phone.trim(),
        address: '',
        city: location.trim(),
        avatar: persistedAvatar,
      })
      const u = res.user
      if (u) {
        setUser(u as AuthUser)
        setAvatarUrl(realAvatar((u.avatar as string) || persistedAvatar))
      }
      setProfileSaved(true)
      setProfileBtnSaved(true)
      setTimeout(() => setProfileBtnSaved(false), 1500)
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Could not save profile. Please try again.'))
    } finally {
      setProfileSaving(false)
    }
  }

  /* ---------------- PASSWORD SAVE ---------------- */

  const setPwdMsg = (field: string, text: string | null) =>
    setPwdMsgs((m) => ({ ...m, [field]: text }))

  const updatePassword = async () => {
    if (!currentPassword) {
      currentPwdRef.current?.focus()
      return
    }
    if (!newPassword) {
      newPwdRef.current?.focus()
      return
    }
    if (newPassword.length < 6) {
      setPwdMsg('general', 'New password must be at least 6 characters.')
      setPwdMsg('ok', null)
      newPwdRef.current?.focus()
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdMsg('general', 'Passwords do not match.')
      setPwdMsg('ok', null)
      confirmPwdRef.current?.focus()
      return
    }
    setPwdUpdating(true)
    setPwdMsg('general', null)
    setPwdMsg('ok', null)
    try {
      await changePassword(currentPassword, newPassword)
      setPwdMsg('ok', 'Password updated successfully.')
      setPwdBtnSaved(true)
      setTimeout(() => setPwdBtnSaved(false), 1500)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPwdMsg('general', getErrorMessage(err, 'Could not update password. Please try again.'))
    } finally {
      setPwdUpdating(false)
    }
  }

  /* ---------------- RENDER HELPERS ---------------- */

  const cardTitle = (icon: string, title: string, subtitle: string, extra = '') => (
    <div className="settings-card-title">
      <div className={`settings-icon${extra ? ' ' + extra : ''}`}>
        <Icon name={icon} />
      </div>
      <div>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
    </div>
  )

  const smallCardHeading = (icon: string, title: string, extra = '') => (
    <div className="small-card-heading">
      <div className={`settings-icon${extra ? ' ' + extra : ''}`}>
        <Icon name={icon} />
      </div>
      <h3>{title}</h3>
    </div>
  )

  const inputRow = (
    label: string,
    nameAttr: string,
    type: string,
    value: string,
    onChange: (v: string) => void,
    ref?: Ref<HTMLInputElement>,
    readOnly?: boolean,
    placeholder?: string,
  ) => (
    <div className="form-group">
      <label htmlFor={nameAttr}>{label}</label>
      <input
        ref={ref}
        id={nameAttr}
        name={nameAttr}
        type={type}
        value={value}
        placeholder={placeholder}
        readOnly={readOnly}
        aria-readonly={readOnly}
        disabled={readOnly}
        autoComplete={type === 'email' ? 'email' : type === 'tel' ? 'tel' : 'off'}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )

  const toggleRow = (
    icon: string,
    title: string,
    subtitle: string,
    checked: boolean,
    onToggle: () => void,
  ) => (
    <div className="preference-row">
      <div className="preference-icon">
        <Icon name={icon} />
      </div>
      <div className="preference-content">
        <strong>{title}</strong>
        <span>{subtitle}</span>
      </div>
      <label className="toggle">
        <input type="checkbox" checked={checked} onChange={onToggle} aria-label={title} />
        <span className="toggle-slider" />
      </label>
    </div>
  )

  const eyeBtn = (label: string, field: 'current' | 'new' | 'confirm') => (
    <button
      type="button"
      className="password-eye"
      aria-label={pwdVisible[field] ? `Hide ${label}` : `Show ${label}`}
      onClick={() => setPwdVisible((v) => ({ ...v, [field]: !v[field] }))}
    >
      <Icon name={pwdVisible[field] ? 'eye-slash' : 'eye'} />
    </button>
  )

  if (loadFailed && !profile) {
    return (
      <div className="settings-page">
        <div className="settings-state">
          <Icon name="triangle-exclamation" style={{ fontSize: 28 }} />
          <div style={{ marginTop: 8 }}>Could not load your account settings.</div>
          <button type="button" className="retry-btn" onClick={load}>
            Retry
          </button>
        </div>
      </div>
    )
  }

  const roleLabel = profile?.role === 'admin' ? 'Admin' : 'Pet Parent'
  const joinedDate = profile?.createdAt
    ? new Date(profile.createdAt as string).toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : '—'

  return (
    <div className="settings-page">
      {/* ================= HEADER ================= */}
      <header className="page-header">
        <div className="header-title">
          <h1>
            Settings
            <span className="settings-title-icon">
              <Icon name="settings" />
            </span>
          </h1>
          <p>Manage your account, pets, preferences and app settings.</p>
        </div>

        <div className="header-actions">
          <Link className="settings-back-btn" to="/app/dashboard">
            <Icon name="arrow-left" />
            Back to Dashboard
          </Link>

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
        </div>
      </header>

      <div className="settings-layout">
        {/* ================= LEFT COLUMN ================= */}
        <div className="settings-left">
          {/* --- PROFILE INFORMATION --- */}
          <section className="settings-card">
            {cardTitle('user', 'Profile Information', 'Update your personal details and profile picture.')}

            <div className="profile-settings-body">
              <div className="settings-profile-photo">
                <div className="settings-avatar-wrapper">
                  <img
                    id="settingsProfileImage"
                    src={avatarUrl}
                    alt="Profile picture"
                    onError={(e) => {
                      const img = e.currentTarget
                      if (img.src !== window.location.origin + DEFAULT_AVATAR) {
                        img.src = DEFAULT_AVATAR
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="change-photo-btn"
                    title="Change profile picture"
                    aria-label="Change profile picture"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Icon name="camera" />
                  </button>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  id="profileImageInput"
                  accept="image/*"
                  aria-label="Profile picture file"
                  hidden
                  onChange={onAvatarChange}
                />
                <span>Profile Picture</span>
                <small>JPG, PNG or WEBP</small>
              </div>

              <div className="profile-form">
                <div className="form-row">
                  {inputRow('Full Name', 'fullName', 'text', name, setName, nameRef)}
                  {inputRow('Email Address', 'email', 'email', email, setEmail, undefined, true)}
                </div>
                <div className="form-row">
                  {inputRow('Phone Number', 'phone', 'tel', phone, setPhone, undefined, false, '+1 555 000 0000')}
                  {inputRow('Location', 'location', 'text', location, setLocation, undefined, false, 'City, Country')}
                </div>

                {profileError && (
                  <div className="form-feedback error" role="alert">
                    <Icon name="triangle-exclamation" />
                    {profileError}
                  </div>
                )}
                {profileSaved && (
                  <div className="form-feedback ok" role="status">
                    <Icon name="circle-check" />
                    Profile saved.
                  </div>
                )}

                <div className="form-button-row">
                  <button
                    type="button"
                    className="purple-btn"
                    onClick={saveProfile}
                    disabled={profileSaving}
                  >
                    {profileSaving ? (
                      <>
                        <Icon name="loading" spin />
                        Saving...
                      </>
                    ) : profileBtnSaved ? (
                      <>
                        <Icon name="check" />
                        Saved
                      </>
                    ) : (
                      <>
                        <Icon name="save" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* --- PREFERENCES --- */}
          <section className="settings-card">
            {cardTitle('sliders-horizontal', 'Preferences', 'Customize your app experience.')}

            <div className="preferences-list">
              {toggleRow(
                'envelope',
                'Email Notifications',
                'Receive updates about appointments, reminders and community activity.',
                prefs.email,
                () => setPref('email', !prefs.email),
              )}
              {toggleRow(
                'bell',
                'Push Notifications',
                'Get instant alerts on your device.',
                prefs.push,
                () => setPref('push', !prefs.push),
              )}
              {toggleRow(
                'calendar-check',
                'Appointment Reminders',
                'Receive reminders before scheduled appointments.',
                prefs.appointments,
                () => setPref('appointments', !prefs.appointments),
              )}
              {toggleRow(
                'moon',
                'Dark Mode',
                theme === 'dark' ? 'Toggle light theme.' : 'Switch to dark theme.',
                theme === 'dark',
                toggle,
              )}
            </div>
          </section>

          {/* --- SECURITY --- */}
          <section className="settings-card">
            {cardTitle('shield-check', 'Security', 'Manage your password and account security.')}

            <div className="security-form">
              <div className="form-group">
                <label htmlFor="currentPassword">Current Password</label>
                <div className="password-input">
                  <input
                    ref={currentPwdRef}
                    id="currentPassword"
                    type={pwdVisible.current ? 'text' : 'password'}
                    placeholder="Enter current password"
                    autoComplete="current-password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                  {eyeBtn('current password', 'current')}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input">
                    <input
                      ref={newPwdRef}
                      id="newPassword"
                      type={pwdVisible.new ? 'text' : 'password'}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                    {eyeBtn('new password', 'new')}
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input">
                    <input
                      ref={confirmPwdRef}
                      id="confirmPassword"
                      type={pwdVisible.confirm ? 'text' : 'password'}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    {eyeBtn('confirm new password', 'confirm')}
                  </div>
                </div>
              </div>

              {pwdMsgs.general && (
                <div className="form-feedback error" role="alert">
                  <Icon name="triangle-exclamation" />
                  {pwdMsgs.general}
                </div>
              )}
              {pwdMsgs.ok && (
                <div className="form-feedback ok" role="status">
                  <Icon name="circle-check" />
                  {pwdMsgs.ok}
                </div>
              )}

              <div className="form-button-row">
                <button
                  type="button"
                  className="purple-btn"
                  onClick={updatePassword}
                  disabled={pwdUpdating}
                >
                  {pwdUpdating ? (
                    <>
                      <Icon name="loading" spin />
                      Updating...
                    </>
                  ) : pwdBtnSaved ? (
                    <>
                      <Icon name="check" />
                      Updated
                    </>
                  ) : (
                    <>
                      <Icon name="lock" />
                      Update Password
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* --- LANGUAGE & REGION --- */}
          <section className="settings-card">
            {cardTitle('globe', 'Language & Region', 'Choose your preferred language and region.')}

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="language">Language</label>
                <div className="select-wrapper">
                  <select id="language" name="language" value="english" disabled>
                    <option value="english">English</option>
                  </select>
                  <Icon name="chevron-down" />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="country">Region</label>
                <div className="select-wrapper">
                  <select id="country" name="country" value="india" disabled>
                    <option value="india">India</option>
                  </select>
                  <Icon name="chevron-down" />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* ================= RIGHT COLUMN ================= */}
        <aside className="settings-right">
          {/* --- ACCOUNT SUMMARY --- */}
          <section className="settings-card">
            {smallCardHeading('user', 'Account Summary')}

            <div className="summary-list">
              <div className="summary-row">
                <span>Account Type</span>
                <strong>{roleLabel}</strong>
              </div>
              <div className="summary-row">
                <span>Member Since</span>
                <strong>{joinedDate}</strong>
              </div>
              <div className="summary-row">
                <span>Total Pets</span>
                <strong>
                  {pets.length} {pets.length === 1 ? 'Pet' : 'Pets'}
                </strong>
              </div>
              <div className="summary-row">
                <span>Appointments</span>
                <strong>{apptCount === null ? '—' : apptCount + ' Scheduled'}</strong>
              </div>
            </div>
          </section>

          {/* --- YOUR PETS --- */}
          <section className="settings-card">
            {smallCardHeading('paw', 'Your Pets', 'pink')}

            {pets.length === 0 ? (
              <div className="pet-empty">No pets added yet.</div>
            ) : (
              <div className="pet-summary-list">
                {pets.map((pet) => (
                  <Link to="/app/mypet" className="pet-summary-item" key={pet._id}>
                    <img
                      src={petImage(pet)}
                      alt={pet.name || 'Pet'}
                      onError={(e) => {
                        const img = e.currentTarget
                        if (!img.src.includes('/assets/images/my-pet/')) {
                          img.src = petImage({ species: pet.species })
                        }
                      }}
                    />
                    <div className="pet-summary-info">
                      <strong>{pet.name}</strong>
                      <span>{breedName(pet)}</span>
                      <small>{ageText(pet)}</small>
                    </div>
                    <Icon name="chevron-right" className="pet-arrow" />
                  </Link>
                ))}
              </div>
            )}

            <Link to="/app/mypet" className="manage-pets-btn">
              <Icon name="paw" />
              Manage Pets
            </Link>
          </section>

          {/* --- APP INFORMATION --- */}
          <section className="settings-card">
            {smallCardHeading('info', 'App Information')}

            <div className="app-info-list">
              <div className="app-info-row">
                <span>App Version</span>
                <strong>v1.0.0</strong>
              </div>
              <button type="button" className="info-link">
                Terms of Service
                <Icon name="chevron-right" />
              </button>
              <button type="button" className="info-link">
                Privacy Policy
                <Icon name="chevron-right" />
              </button>
              <button type="button" className="info-link">
                Help &amp; Support
                <Icon name="chevron-right" />
              </button>
            </div>
          </section>
        </aside>
      </div>

      {/* ================= FOOTER ================= */}
      <footer className="settings-footer">
        <span className="footer-heart">♥</span>
        <strong>Thank you for being a part of Famipet!</strong>
        <span>We care for your pets as much as you do. 🐾</span>
      </footer>
    </div>
  )
}