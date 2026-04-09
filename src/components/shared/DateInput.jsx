import React from 'react'

// Converts stored YYYY-MM-DD to display MM/DD/YYYY
function isoToDisplay(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${m}/${d}/${y}`
}

// Converts display MM/DD/YYYY to stored YYYY-MM-DD; returns '' on invalid input
function displayToISO(display) {
  if (!display) return ''
  const parts = display.split('/')
  if (parts.length !== 3) return ''
  const [m, d, y] = parts
  if (!m || !d || !y || y.length !== 4) return ''
  const padded = `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  if (isNaN(new Date(padded).getTime())) return ''
  return padded
}

// Controlled date text input. Stores as YYYY-MM-DD, displays as MM/DD/YYYY.
// Validates and normalises on blur; invalid or incomplete input commits as ''.
export default function DateInput({ value, onChange }) {
  const [draft, setDraft] = React.useState(null) // null = not editing

  const displayValue = draft !== null ? draft : isoToDisplay(value)

  function handleFocus(e) {
    setDraft(isoToDisplay(value))
    e.target.style.borderColor = 'var(--color-brand-gold)'
  }

  function handleBlur(e) {
    const raw = (draft ?? '').trim()
    setDraft(null)
    onChange(displayToISO(raw))
    e.target.style.borderColor = 'var(--color-border)'
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      placeholder="MM/DD/YYYY"
      value={displayValue}
      onChange={e => setDraft(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      style={{
        width:           '100%',
        height:          '44px',
        backgroundColor: 'var(--color-surface-2)',
        color:           'var(--color-text-primary)',
        border:          '1px solid var(--color-border)',
        borderRadius:    '8px',
        padding:         '0 12px',
        fontSize:        'var(--text-label)',
        fontFamily:      'var(--font-sans)',
        outline:         'none',
        boxSizing:       'border-box',
      }}
    />
  )
}
