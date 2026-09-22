// Dashboard page sections — faithful React port of the cards in
// frontend/pages/dashboard.html, populated from the backend (migration.md
// Phase 8). Loading shows a neutral placeholder (NOT the Vanilla static sample
// content with fake pets/numbers — AGENTS.md §5); real data or empty states
// render once the API settles.

import type { CSSProperties, ReactNode } from 'react'
import { Link } from 'react-router-dom'
import type { Appointment } from '../../../api/appointments'
import type { AppNotification } from '../../../api/notifications'
import type { Pet } from '../../../api/pets'
import type { Reminder } from '../../../api/reminders'
import { ageText, breedName, fmtDate, fmtTime, petImage } from '../../../lib/formatters'
import { FavoriteButton } from '../../../components/shared/FavoriteButton'
import { Icon } from '../../../components/shared/Icon'

export interface ActivityItem {
  title: string
  date: string
  icon: string
  color: string
  status: string
  cls: string
}

const LOADING_STYLE: CSSProperties = {
  padding: '18px',
  textAlign: 'center',
  color: '#8f8f9a',
  width: '100%',
}

function Loading() {
  return <div style={LOADING_STYLE}>Loading…</div>
}

function EmptyMessage({ children }: { children: ReactNode }) {
  return <div style={LOADING_STYLE}>{children}</div>
}

function CardHeader({ title, sub, link, linkLabel }: { title: string; sub: string; link: string; linkLabel: string }) {
  return (
    <div className="card-header">
      <div>
        <h2>{title}</h2>
        <p>{sub}</p>
      </div>
      {link === '#' ? (
        <a href="#">{linkLabel}</a>
      ) : (
        <Link to={link}>{linkLabel}</Link>
      )}
    </div>
  )
}

export function StatCard({
  icon,
  label,
  value,
  href,
  linkLabel,
  decoration,
  className,
}: {
  icon: string
  label: string
  value: number
  href: string
  linkLabel: string
  decoration: string
  className: string
}) {
  return (
    <div className={`stat-card ${className}`}>
      <div className="stat-top">
        <div className="stat-icon">
          <Icon name={icon} />
        </div>
        <span>{label}</span>
      </div>
      <div className="stat-number">{value}</div>
      <Link to={href}>{linkLabel}</Link>
      <div className="stat-decoration">{decoration}</div>
    </div>
  )
}

export function PetsSection({
  pets,
  favIds,
  onToggleFavorite,
}: {
  pets: Pet[] | null
  favIds: Set<string>
  onToggleFavorite: (petId: string, previouslyLiked: boolean) => void
}) {
  return (
    <section className="dashboard-card pets-section">
      <CardHeader title="My Pets" sub="Your furry family" link="/app/mypet" linkLabel="View All" />
      <div className="pets-list">
        {pets === null ? (
          <Loading />
        ) : pets.length === 0 ? (
          <EmptyMessage>
            No pets yet.{' '}
            <Link to="/app/mypet" style={{ color: '#FF5C8A', fontWeight: 600 }}>
              Add your first pet →
            </Link>
          </EmptyMessage>
        ) : (
          pets.slice(0, 3).map((pet) => {
            const liked = favIds.has(String(pet._id))
            return (
              <article className="pet-card" key={pet._id}>
                <div className="pet-image-wrapper">
                  <img src={petImage(pet)} alt={pet.name} />
                  <FavoriteButton petId={String(pet._id)} name={pet.name} liked={liked} onToggle={onToggleFavorite} />
                </div>
                <div className="pet-info">
                  <h3>{pet.name}</h3>
                  <p>{breedName(pet)}</p>
                  <span>{ageText(pet)}</span>
                </div>
              </article>
            )
          })
        )}
      </div>
    </section>
  )
}

export function AppointmentSection({
  appointment,
  loading,
}: {
  appointment: Appointment | null
  loading: boolean
}) {
  return (
    <section className="dashboard-card appointment-section">
      <CardHeader title="Upcoming Appointment" sub="Don't miss your pet's care" link="/app/appointments" linkLabel="View Calendar" />
      <div className="appointment-box">
        {loading ? (
          <Loading />
        ) : !appointment ? (
          <div className="appointment-details" style={{ width: '100%' }}>
            <span className="appointment-label" style={{ color: '#8f8f9a' }}>
              NO UPCOMING APPOINTMENT
            </span>
            <h3>You're all caught up!</h3>
            <div className="appointment-meta">
              <span>Book a visit for your pet anytime.</span>
            </div>
          </div>
        ) : (
          <>
            <div className="appointment-icon">
              <Icon name="stethoscope" />
            </div>
            <div className="appointment-details">
              <span className="appointment-label">{String(appointment.type || 'checkup').toUpperCase()}</span>
              <h3>{(typeof appointment.pet === 'object' && appointment.pet?.name) || 'Your Pet'}</h3>
              <div className="appointment-meta">
                <span>
                  <Icon name="calendar" /> {fmtDate(appointment.date)}
                </span>
                <span>
                  <Icon name="clock" /> {fmtTime(appointment.time)}
                </span>
              </div>
            </div>
            <div className="appointment-pet">
              <img
                src={petImage(typeof appointment.pet === 'object' ? appointment.pet : undefined)}
                alt={(typeof appointment.pet === 'object' && appointment.pet?.name) || 'Your Pet'}
              />
            </div>
          </>
        )}
      </div>
      <Link className="appointment-button" to="/app/appointments">
        View Appointment Details
      </Link>
    </section>
  )
}

export function ActivitySection({ items }: { items: ActivityItem[] | null }) {
  return (
    <section className="dashboard-card activity-section">
      <CardHeader title="Recent Activity" sub="Latest updates" link="#" linkLabel="View All" />
      <div className="activity-list">
        {items === null ? (
          <Loading />
        ) : items.length === 0 ? (
          <EmptyMessage>No recent activity yet.</EmptyMessage>
        ) : (
          items.map((it, i) => (
            <div className="activity-item" key={i}>
              <div className={`activity-icon ${it.color}`}>
                <Icon name={it.icon} />
              </div>
              <div>
                <h4>{it.title}</h4>
                <p>{it.date}</p>
              </div>
              <span className={`status ${it.cls}`}>{it.status}</span>
            </div>
          ))
        )}
      </div>
    </section>
  )
}

function isToday(d?: string | Date | null) {
  return fmtDate(d) === fmtDate(new Date())
}

export function RemindersSection({ reminders }: { reminders: Reminder[] | null }) {
  const icons = ['pill', 'calendar-days', 'utensils']
  const colors = ['lavender', 'pink', 'green']
  return (
    <section className="dashboard-card reminders-section">
      <CardHeader title="Reminders" sub="Upcoming pet care" link="/app/reminders" linkLabel="View All" />
      <div className="reminder-list">
        {reminders === null ? (
          <Loading />
        ) : reminders.length === 0 ? (
          <EmptyMessage>
            No reminders scheduled.{' '}
            <Link to="/app/reminders" style={{ color: '#FF5C8A', fontWeight: 600 }}>
              Add one →
            </Link>
          </EmptyMessage>
        ) : (
          reminders.slice(0, 3).map((r, i) => {
            const when = `${fmtDate(r.date)}${r.time ? ', ' + fmtTime(r.time) : ''}`
            const today = isToday(r.date)
            return (
              <div className="reminder-item" key={r._id}>
                <div className={`reminder-icon ${colors[i % colors.length]}`}>
                  <Icon name={icons[i % icons.length]} />
                </div>
                <div>
                  <h4>{r.title}</h4>
                  <p>{when}</p>
                </div>
                {r.isCompleted ? (
                  <span className="reminder-upcoming">Done</span>
                ) : (
                  <span className={today ? 'reminder-today' : 'reminder-upcoming'}>{today ? 'Today' : 'Upcoming'}</span>
                )}
              </div>
            )
          })
        )}
      </div>
    </section>
  )
}

export function LoveCard() {
  return (
    <section className="love-card">
      <div className="love-content">
        <span className="quote-mark">“</span>
        <h2>
          Every paw
          <br />
          prints a
          <br />
          story of love.
        </h2>
        <div className="love-paws">🐾 ♡ 🐾</div>
      </div>
      <div className="love-image">
        <img src="/assets/images/dashboard/cute-pet.svg" alt="Cute pets" />
      </div>
    </section>
  )
}

export function NotificationPanel({
  open,
  notes,
  onClose,
}: {
  open: boolean
  notes: AppNotification[] | null
  onClose: () => void
}) {
  const colors = ['pink', 'green', 'lavender']
  const icons = ['syringe', 'check', 'heart']
  return (
    <div className={`notification-panel${open ? ' show' : ''}`} id="notificationPanel">
      <div className="notification-header">
        <h3>Notifications</h3>
        <button type="button" onClick={onClose}>
          ×
        </button>
      </div>
      {notes === null ? (
        <Loading />
      ) : notes.length === 0 ? (
        <div style={LOADING_STYLE}>No notifications yet.</div>
      ) : (
        notes.slice(0, 5).map((n, i) => (
          <div className="notification-item" key={n._id}>
            <div className={`notification-icon ${colors[i % colors.length]}`}>
              <Icon name={icons[i % icons.length]} />
            </div>
            <div>
              <strong>{n.title}</strong>
              <span>{n.message || fmtDate(n.createdAt)}</span>
            </div>
          </div>
        ))
      )}
    </div>
  )
}