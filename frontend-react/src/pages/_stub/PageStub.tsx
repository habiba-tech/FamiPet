// Placeholder rendered by routes whose pages belong to later migration phases.
// Each route swaps this for its real page component during its phase.

export function PageStub({ title }: { title: string }) {
  return (
    <div className="p-8 text-center">
      <span className="inline-block rounded-full bg-primary-light px-4 py-1 text-xs font-medium text-primary-dark">
        route stub
      </span>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink">{title}</h1>
      <p className="mt-1 text-sm text-ink-light">
        Page implemented in a later migration phase
      </p>
    </div>
  )
}