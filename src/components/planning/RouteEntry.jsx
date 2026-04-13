// ── RouteEntry ────────────────────────────────────────────────
//
// Two-mode route entry panel.
//
// Mode A — guided: departure + destination inputs (+ optional stops).
// Mode B — route string: free-text "KIAD MAPAX KOKV KIAD" input.
//
// Auto-triggers fetch exactly once when routeReady becomes true
// (no explicit submit button needed). Uses hasFiredRef to prevent
// double-firing on re-renders.
//
// Props:
//   routeState:    return value of useRouteState()
//   onCommit:      (routeLegs) => void   — called with leg definitions

import React, { useEffect, useRef, useState } from 'react'
import { isValidId } from '../../hooks/useRouteState'

// ── Shared input style ────────────────────────────────────────

const inputStyle = {
  width:           '100%',
  height:          '48px',
  background:      'var(--color-surface-2)',
  border:          '1px solid var(--color-border)',
  borderRadius:    '8px',
  color:           'var(--color-text-primary)',
  fontFamily:      'var(--font-mono)',
  fontSize:        'var(--text-body)',
  fontWeight:      500,
  padding:         '0 14px',
  outline:         'none',
  letterSpacing:   '0.06em',
  textTransform:   'uppercase',
  caretColor:      'var(--color-brand-gold)',
}

const labelStyle = {
  fontFamily:  'var(--font-sans)',
  fontSize:    'var(--text-small)',
  color:       'var(--color-text-muted)',
  marginBottom:'4px',
  display:     'block',
}

// ── Airport input with blur-normalization ─────────────────────

function AirportField({ label, value, onChange, onBlurNormalize, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onBlurNormalize(e.target.value)}
        style={inputStyle}
        maxLength={5}
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
      />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────

export default function RouteEntry({ routeState, onCommit }) {
  const {
    departure, setDeparture, destination, setDestination,
    stops, addStop, updateStop, removeStop,
    legs, routeReady, normalizeId,
    parseRouteString, editableRouteString,
    entryMode, setEntryMode,
  } = routeState

  const [routeInput, setRouteInput] = useState('')
  const [routeError, setRouteError] = useState(false)
  const hasFiredRef = useRef(false)

  // Auto-trigger fetch exactly once when routeReady becomes true
  useEffect(() => {
    if (routeReady && !hasFiredRef.current) {
      hasFiredRef.current = true
      onCommit(legs)
    }
    if (!routeReady) {
      hasFiredRef.current = false
    }
  }, [routeReady, legs, onCommit])

  // Mode toggle
  const activeMode = entryMode ?? 'guided'

  function handleModeSwitch(mode) {
    setEntryMode(mode)
    setRouteError(false)
    if (mode === 'route' && editableRouteString) {
      setRouteInput(editableRouteString)
    }
  }

  // Route string commit on Enter
  function handleRouteKeyDown(e) {
    if (e.key === 'Enter') commitRouteString()
  }

  function commitRouteString() {
    const ok = parseRouteString(routeInput)
    if (!ok) {
      setRouteError(true)
    } else {
      setRouteError(false)
      setEntryMode('guided')
    }
  }

  // Normalize identifier on blur
  function handleAirportBlur(val, setter) {
    setter(normalizeId(val))
  }

  const tabBase = {
    flex:        1,
    height:      '36px',
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--text-label)',
    transition:  'color 150ms ease',
  }

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '48px 24px 24px' }}
    >
      {/* Mode tabs */}
      <div style={{
        display:       'flex',
        borderBottom:  '1px solid var(--color-border)',
        marginBottom:  '28px',
      }}>
        {['guided', 'route'].map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeSwitch(mode)}
            style={{
              ...tabBase,
              color:         activeMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderBottom:  activeMode === mode ? '2px solid var(--color-brand-gold)' : '2px solid transparent',
              fontWeight:    activeMode === mode ? 500 : 400,
              marginBottom:  '-1px',
            }}
          >
            {mode === 'guided' ? 'Airports' : 'Route string'}
          </button>
        ))}
      </div>

      {/* Guided mode */}
      {activeMode === 'guided' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <AirportField
            label="Departure"
            value={departure}
            placeholder="KIAD"
            onChange={setDeparture}
            onBlurNormalize={v => handleAirportBlur(v, setDeparture)}
          />

          {stops.map((stop, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <AirportField
                  label={`Stop ${i + 1}`}
                  value={stop}
                  placeholder="KOKV"
                  onChange={v => updateStop(i, v)}
                  onBlurNormalize={v => {
                    updateStop(i, normalizeId(v))
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStop(i)}
                style={{
                  height:      '48px',
                  width:       '48px',
                  flexShrink:  0,
                  background:  'var(--color-surface-2)',
                  border:      '1px solid var(--color-border)',
                  borderRadius:'8px',
                  color:       'var(--color-text-muted)',
                  cursor:      'pointer',
                  fontSize:    '1.1rem',
                  display:     'flex',
                  alignItems:  'center',
                  justifyContent:'center',
                }}
              >
                ×
              </button>
            </div>
          ))}

          <AirportField
            label="Destination"
            value={destination}
            placeholder="KOKV"
            onChange={setDestination}
            onBlurNormalize={v => handleAirportBlur(v, setDestination)}
          />

          <button
            type="button"
            onClick={addStop}
            style={{
              height:        '40px',
              background:    'none',
              border:        '1px dashed var(--color-border)',
              borderRadius:  '8px',
              color:         'var(--color-text-muted)',
              fontFamily:    'var(--font-sans)',
              fontSize:      'var(--text-label)',
              cursor:        'pointer',
              marginTop:     '4px',
            }}
          >
            + Add stop
          </button>
        </div>
      )}

      {/* Route string mode */}
      {activeMode === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={labelStyle}>
            Route string
          </label>
          <input
            type="text"
            value={routeInput}
            onChange={e => { setRouteInput(e.target.value.toUpperCase()); setRouteError(false) }}
            onKeyDown={handleRouteKeyDown}
            placeholder="KIAD MAPAX KOKV KIAD"
            style={{
              ...inputStyle,
              height:        '52px',
              borderColor:   routeError ? 'var(--color-hazard)' : 'var(--color-border)',
              letterSpacing: '0.03em',
            }}
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
          {routeError && (
            <p style={{ margin: 0, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-small)', color: 'var(--color-hazard)' }}>
              Need at least two airport identifiers.
            </p>
          )}
          <button
            type="button"
            onClick={commitRouteString}
            style={{
              height:        '44px',
              background:    'var(--color-surface-2)',
              border:        '1px solid var(--color-border)',
              borderRadius:  '8px',
              color:         'var(--color-text-primary)',
              fontFamily:    'var(--font-sans)',
              fontSize:      'var(--text-label)',
              cursor:        'pointer',
              fontWeight:    500,
            }}
          >
            Parse route
          </button>
          <p style={{
            margin:     0,
            fontFamily: 'var(--font-sans)',
            fontSize:   'var(--text-small)',
            color:      'var(--color-text-muted)',
            lineHeight: 1.55,
          }}>
            3–4 char tokens are treated as airports. 5-char tokens are waypoints on the preceding leg.
          </p>
        </div>
      )}
    </div>
  )
}
