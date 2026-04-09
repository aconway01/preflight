import React, { useState, useEffect, useRef } from 'react'
import { isValidId, normalizeId } from '../../hooks/useRouteState'

// Always-visible editable route string.
// Syncs from `derivedValue` (computed from route state) while the pilot is not typing.
// Once dirty, the pilot's in-progress input is preserved until Enter / blur commit or Escape revert.
// Calls onCommit(string) only when the string is valid; invalid input shows an error in place.

export default function EditableRouteString({ derivedValue, onCommit }) {
  const [inputVal, setInputVal] = useState(derivedValue)
  const [dirty,    setDirty]    = useState(false)
  const [error,    setError]    = useState('')
  const inputRef = useRef(null)

  // Keep in sync with external state when not actively editing
  useEffect(() => {
    if (!dirty) {
      setInputVal(derivedValue)
    }
  }, [derivedValue, dirty])

  function validate(str) {
    const parts = str.trim().split(/\s+/).filter(Boolean)
    if (parts.length < 2) return 'Enter at least a departure and destination'
    const invalid = parts.filter(p => {
      const clean = p.replace(/[^A-Z0-9]/g, '')
      if (clean.length === 5) return false   // nav fix — always valid
      return !isValidId(normalizeId(clean))
    })
    if (invalid.length > 0) return `Not recognized: ${invalid.join(', ')}`
    return null
  }

  function tryCommit() {
    if (!dirty) return
    const err = validate(inputVal)
    if (err) {
      setError(err)
      return
    }
    onCommit(inputVal.trim())
    setDirty(false)
    setError('')
  }

  function handleChange(e) {
    setInputVal(e.target.value.toUpperCase())
    setDirty(true)
    setError('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      tryCommit()
      if (!validate(inputVal)) inputRef.current?.blur()
    }
    if (e.key === 'Escape') {
      setInputVal(derivedValue)
      setDirty(false)
      setError('')
      inputRef.current?.blur()
    }
  }

  function handleBlur() {
    // Only auto-commit on blur if there's a plausible complete string (≥2 tokens).
    // Partial/single-token input is left for the pilot to fix rather than committed or silently reverted.
    if (!dirty) return
    const parts = inputVal.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) {
      tryCommit()
    }
    // Single-token: leave dirty so error or hint stays visible on refocus
  }

  const showHint = dirty && !error

  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label
        className="text-label"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Route
      </label>

      <input
        ref={inputRef}
        type="text"
        value={inputVal}
        onChange={handleChange}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        autoCorrect="off"
        autoCapitalize="characters"
        spellCheck={false}
        className="w-full rounded-lg border px-4 font-mono focus:outline-none text-label"
        style={{
          height:          '44px',
          backgroundColor: 'var(--color-surface-2)',
          color:           'var(--color-text-primary)',
          borderColor:     error ? 'var(--color-below)' : 'var(--color-border)',
          caretColor:      'var(--color-brand-gold)',
        }}
        onFocus={e => {
          e.target.style.borderColor = error ? 'var(--color-below)' : 'var(--color-brand-gold)'
        }}
        aria-label="Route string"
      />

      {error && (
        <span className="text-small" style={{ color: 'var(--color-below)' }} role="alert">
          {error}
        </span>
      )}
      {showHint && (
        <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
          Press Enter to update route
        </span>
      )}
    </div>
  )
}
