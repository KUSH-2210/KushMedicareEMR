import { useId, useMemo, useState } from 'react'

interface SearchablePickerProps {
  label: string
  catalog: readonly string[]
  selected: string[]
  onAdd: (value: string) => void
  placeholder?: string
}

export function SearchablePicker({ label, catalog, selected, onAdd, placeholder }: SearchablePickerProps) {
  const id = useId()
  const [query, setQuery] = useState('')
  const normalized = query.trim().toLocaleLowerCase()
  const suggestions = useMemo(() => catalog
    .filter((item) => !selected.some((selectedItem) => selectedItem.toLocaleLowerCase() === item.toLocaleLowerCase()))
    .filter((item) => !normalized || item.toLocaleLowerCase().includes(normalized))
    .slice(0, 8), [catalog, normalized, selected])
  const canAddCustom = query.trim().length > 0
    && ![...catalog, ...selected].some((item) => item.toLocaleLowerCase() === normalized)

  function add(value: string) {
    onAdd(value.trim())
    setQuery('')
  }

  return (
    <div className="picker">
      <label htmlFor={id}>{label}</label>
      <input
        id={id}
        value={query}
        onChange={(event) => setQuery(event.target.value.slice(0, 300))}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && canAddCustom) {
            event.preventDefault()
            add(query)
          }
        }}
        placeholder={placeholder ?? `Search or add ${label.toLocaleLowerCase()}`}
        autoComplete="off"
      />
      <div className="picker__suggestions" aria-label={`${label} suggestions`}>
        {suggestions.map((item) => <button type="button" className="choice-chip" key={item} onClick={() => add(item)}>+ {item}</button>)}
        {canAddCustom && <button type="button" className="choice-chip choice-chip--custom" onClick={() => add(query)}>+ Add “{query.trim()}”</button>}
      </div>
    </div>
  )
}
