// SearchBar — the Vanilla adoption `.search-box` (icon + live text input).

import { Icon } from '../../../components/shared/Icon'

export function SearchBar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="search-box">
      <Icon name="magnifying-glass" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search pets by name, breed..."
        aria-label="Search pets"
        autoComplete="off"
      />
    </div>
  )
}