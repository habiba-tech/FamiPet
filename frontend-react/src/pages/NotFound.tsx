import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="p-8 text-center">
      <span className="inline-block rounded-full bg-primary-light px-4 py-1 text-xs font-medium text-primary-dark">
        404
      </span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">Page not found</h1>
      <p className="mt-1 text-sm text-ink-light">
        <Link to="/" className="font-medium text-primary">
          Back to home
        </Link>
      </p>
    </div>
  )
}