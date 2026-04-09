import React, { useRef, useEffect, useState } from 'react'
import { isValidId, normalizeId } from '../../hooks/useRouteState'

// AirportInput owns its draft value during editing.
// onChange (parent commit) fires only on blur or Enter — never on keystroke.
// isFocusedRef gates the external-sync effect so it never runs on focus/blur
// transitions, only when the external value prop actually changes — this is
// what keeps cursor position stable when clicking into a pre-filled field.

export default function AirportInput({
  value,
  onChange,
  placeholder = 'Identifier',
  label,
  autoFocus = false,
  inputRef: externalRef,
}) {
  const internalRef  = useRef(null)
  const ref          = externalRef || internalRef
  const isFocusedRef       = useRef(false)
  const hasBeenCommitted   = useRef(false)
  const [draft,    setDraft]    = useState(value)
  const [focused,  setFocused]  = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus()
  }, [autoFocus]) // eslint-disable-line react-hooks/exhaustive-deps

  // Sync draft from external prop (e.g. parseRouteString) only when not editing.
  // Dep list is [value] only — not focused — so this effect never fires on
  // focus/blur, eliminating any setState that could disturb cursor position.
  // isFocusedRef (not state) gates the update to avoid overwriting an in-progress edit.
  useEffect(() => {
    if (!isFocusedRef.current) setDraft(value)
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  function commit() {
    if (!draft) {
      // Empty — only show an error if the field has been successfully committed
      // before. A first-time blur on an empty field is silent (pilot hasn't
      // started yet).
      if (hasBeenCommitted.current) setErrorMsg('Enter airport')
      return
    }
    const normalized = normalizeId(draft)
    if (!isValidId(normalized)) {
      // Partial or unrecognized — keep existing route state, show error.
      // Never write an invalid value to route state so routeReady stays stable.
      setErrorMsg(`${draft} not recognized`)
      return
    }
    setErrorMsg('')
    hasBeenCommitted.current = true
    onChange(normalized)
  }

  function handleChange(e) {
    setDraft(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5))
    setErrorMsg('')
  }

  function handleMouseDown(e) {
    // Only intercept when the field already has a value — prevents the browser
    // from placing the cursor at the click position, then immediately corrects
    // to end-of-value with no visible jump.
    if (e.currentTarget.value) {
      e.preventDefault()
      const input = e.currentTarget
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  }

  function handleFocus() {
    isFocusedRef.current = true
    setFocused(true)
  }

  function handleBlur() {
    isFocusedRef.current = false
    setFocused(false)
    commit()
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      commit()
      ref.current?.blur()
    }
  }

  return (
    <div className="flex flex-col gap-1 w-full">
      {label && (
        <label
          className="text-label"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          {label}
        </label>
      )}
      <input
        ref={ref}
        type="text"
        inputMode="text"
        value={draft}
        onChange={handleChange}
        onMouseDown={handleMouseDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoCapitalize="characters"
        autoCorrect="off"
        autoComplete="off"
        spellCheck={false}
        maxLength={5}
        className="font-mono w-full rounded-lg border px-4 focus:outline-none transition-colors"
        style={{
          height:          '44px',
          fontSize:        'var(--text-title)',
          backgroundColor: 'var(--color-surface-2)',
          color:           'var(--color-text-primary)',
          borderColor:     focused
            ? 'var(--color-brand-gold)'
            : errorMsg ? 'var(--color-below)' : 'var(--color-border)',
          caretColor:      'var(--color-brand-gold)',
        }}
      />
      {errorMsg && (
        <span
          className="text-small"
          style={{ color: 'var(--color-below)' }}
          role="alert"
        >
          {errorMsg}
        </span>
      )}
    </div>
  )
}
