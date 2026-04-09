import React, { useState, useRef, useEffect } from 'react'
import { isValidId, normalizeId } from '../../hooks/useRouteState'

export default function RouteStringInput({ onParse, onDismiss }) {
  const [value,  setValue]  = useState('')
  const [error,  setError]  = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [])

  // Parse on submit — normalize each token then validate format.
  // "IAD KJFK" is valid: IAD normalizes to KIAD, KJFK is already 4-char ICAO.
  // 5-char nav fixes (MAPAX, WITCH) are valid route tokens — not airport IDs,
  // so we pass them through as stops and let the pilot sort them.
  function handleSubmit(e) {
    e?.preventDefault()
    const parts = value.trim().toUpperCase().split(/\s+/).filter(Boolean)
    if (parts.length < 2) {
      setError('Enter at least a departure and destination — e.g. KIAD KJFK')
      return
    }
    // Airports must be 3–4 alphanumeric chars (normalizable to 4-char ICAO).
    // 5-char nav fixes are fine. Flag anything that doesn't fit.
    const invalid = parts.filter(p => {
      const clean = p.replace(/[^A-Z0-9]/g, '')
      if (clean.length === 5) return false   // nav fix — pass through
      return !isValidId(normalizeId(clean))
    })
    if (invalid.length > 0) {
      setError(`Not recognized: ${invalid.join(', ')}`)
      return
    }
    onParse(value)
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  handleSubmit()
    if (e.key === 'Escape') onDismiss()
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      <label
        className="text-label"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Route string
      </label>

      <div className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => { setValue(e.target.value.toUpperCase()); setError('') }}
          onKeyDown={handleKeyDown}
          placeholder="KIAD MAPAX KOKV KFDK KIAD"
          autoCorrect="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono flex-1 rounded-lg border px-4 focus:outline-none transition-colors"
          style={{
            height:          '44px',
            fontSize:        'var(--text-label)',
            backgroundColor: 'var(--color-surface-2)',
            color:           'var(--color-text-primary)',
            borderColor:     error ? 'var(--color-below)' : 'var(--color-border)',
            caretColor:      'var(--color-brand-gold)',
          }}
          onFocus={e => { e.target.style.borderColor = error ? 'var(--color-below)' : 'var(--color-brand-gold)' }}
          onBlur={e =>  { e.target.style.borderColor = error ? 'var(--color-below)' : 'var(--color-border)' }}
        />
        <button
          type="submit"
          className="rounded-lg px-4 font-medium text-label transition-colors"
          style={{
            height:          '44px',
            backgroundColor: 'var(--color-brand-gold)',
            color:           'var(--color-base)',
            border:          'none',
            cursor:          'pointer',
          }}
        >
          Use
        </button>
      </div>

      {error && (
        <span
          className="text-small"
          style={{ color: 'var(--color-below)' }}
          role="alert"
        >
          {error}
        </span>
      )}

      <button
        type="button"
        onClick={onDismiss}
        className="text-small self-start"
        style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '0' }}
      >
        ← Back to guided entry
      </button>
    </form>
  )
}
