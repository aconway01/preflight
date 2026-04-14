// ── RouteEntry ────────────────────────────────────────────────
//
// Two-mode route entry panel.
//
// Mode A — guided: departure + destination inputs (+ optional stops).
//   "Get weather" button appears when both departure and destination
//   are valid. Pilot taps it to commit and trigger the fetch.
//
// Mode B — route string: free-text "KIAD MAPAX KOKV KIAD" input.
//   "Get weather" button parses the string and triggers fetch in one
//   action. After parseRouteString updates state, a pendingCommit
//   effect fires onCommit(legs) once routeReady is true.
//
// Props:
//   routeState:    return value of useRouteState()
//   onCommit:      (routeLegs) => void   — called with leg definitions

import React, { useEffect, useState } from 'react'

// ── Shared styles ─────────────────────────────────────────────

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
  fontFamily:   'var(--font-sans)',
  fontSize:     'var(--text-small)',
  color:        'var(--color-text-muted)',
  marginBottom: '4px',
  display:      'block',
}

// ── Airport input with blur-normalization ─────────────────────

function AirportField({ label, value, onChange, onBlur, placeholder }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={e => onChange(e.target.value)}
        onBlur={e => onBlur(e.target.value)}
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
    departure, setDeparture,
    destination, setDestination,
    stops, addStop, updateStop, removeStop,
    legs, routeReady, normalizeId,
    parseRouteString, editableRouteString,
    entryMode, setEntryMode,
  } = routeState

  const [routeInput,    setRouteInput]    = useState('')
  const [routeError,    setRouteError]    = useState(false)
  const [pendingCommit, setPendingCommit] = useState(false)

  // After route string parse updates state, wait for routeReady then commit
  useEffect(() => {
    if (pendingCommit && routeReady) {
      setPendingCommit(false)
      onCommit(legs)
    }
  }, [pendingCommit, routeReady, legs, onCommit])

  const activeMode = entryMode ?? 'guided'

  function handleModeSwitch(mode) {
    setEntryMode(mode)
    setRouteError(false)
    if (mode === 'route' && editableRouteString) {
      setRouteInput(editableRouteString)
    }
  }

  // Guided mode — explicit commit
  function handleGetWeather() {
    onCommit(legs)
  }

  // Route string mode — parse and commit in one action
  function handleRouteStringGetWeather() {
    const ok = parseRouteString(routeInput)
    if (!ok) {
      setRouteError(true)
      return
    }
    setRouteError(false)
    // parseRouteString sets state asynchronously; pendingCommit effect
    // fires onCommit once routeReady becomes true after React re-renders.
    setPendingCommit(true)
  }

  function handleRouteKeyDown(e) {
    if (e.key === 'Enter') handleRouteStringGetWeather()
  }

  function handleAirportBlur(val, setter) {
    setter(normalizeId(val))
  }

  const tabBase = {
    flex:       1,
    height:     '36px',
    background: 'none',
    border:     'none',
    cursor:     'pointer',
    fontFamily: 'var(--font-sans)',
    fontSize:   'var(--text-label)',
    transition: 'color 150ms ease',
  }

  const commitBtnStyle = {
    height:       '48px',
    background:   'var(--color-brand-gold)',
    border:       'none',
    borderRadius: '8px',
    color:        '#0D1120',
    fontFamily:   'var(--font-sans)',
    fontSize:     'var(--text-label)',
    fontWeight:   600,
    cursor:       'pointer',
    width:        '100%',
  }

  return (
    <div
      className="flex-1 flex flex-col"
      style={{ maxWidth: '640px', margin: '0 auto', width: '100%', padding: '48px 24px 24px' }}
    >
      {/* Mode tabs */}
      <div style={{
        display:      'flex',
        borderBottom: '1px solid var(--color-border)',
        marginBottom: '28px',
      }}>
        {['guided', 'route'].map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => handleModeSwitch(mode)}
            style={{
              ...tabBase,
              color:        activeMode === mode ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              borderBottom: activeMode === mode ? '2px solid var(--color-brand-gold)' : '2px solid transparent',
              fontWeight:   activeMode === mode ? 500 : 400,
              marginBottom: '-1px',
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
            onBlur={v => handleAirportBlur(v, setDeparture)}
          />

          {stops.map((stop, i) => (
            <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <AirportField
                  label={`Stop ${i + 1}`}
                  value={stop}
                  placeholder="KOKV"
                  onChange={v => updateStop(i, v)}
                  onBlur={v => updateStop(i, normalizeId(v))}
                />
              </div>
              <button
                type="button"
                onClick={() => removeStop(i)}
                style={{
                  height:         '48px',
                  width:          '48px',
                  flexShrink:     0,
                  background:     'var(--color-surface-2)',
                  border:         '1px solid var(--color-border)',
                  borderRadius:   '8px',
                  color:          'var(--color-text-muted)',
                  cursor:         'pointer',
                  fontSize:       '1.1rem',
                  display:        'flex',
                  alignItems:     'center',
                  justifyContent: 'center',
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
            onBlur={v => handleAirportBlur(v, setDestination)}
          />

          <button
            type="button"
            onClick={addStop}
            style={{
              height:       '40px',
              background:   'none',
              border:       '1px dashed var(--color-border)',
              borderRadius: '8px',
              color:        'var(--color-text-muted)',
              fontFamily:   'var(--font-sans)',
              fontSize:     'var(--text-label)',
              cursor:       'pointer',
            }}
          >
            + Add stop
          </button>

          {/* Commit button — appears when both airports are valid */}
          {routeReady && (
            <button type="button" onClick={handleGetWeather} style={commitBtnStyle}>
              Get weather
            </button>
          )}
        </div>
      )}

      {/* Route string mode */}
      {activeMode === 'route' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={labelStyle}>Route string</label>
          <input
            type="text"
            value={routeInput}
            onChange={e => { setRouteInput(e.target.value.toUpperCase()); setRouteError(false) }}
            onKeyDown={handleRouteKeyDown}
            placeholder="KIAD MAPAX KOKV KIAD"
            style={{
              ...inputStyle,
              height:      '52px',
              borderColor: routeError ? 'var(--color-hazard)' : 'var(--color-border)',
              letterSpacing:'0.03em',
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
            onClick={handleRouteStringGetWeather}
            style={commitBtnStyle}
          >
            Get weather
          </button>
          <p style={{
            margin:     0,
            fontFamily: 'var(--font-sans)',
            fontSize:   'var(--text-small)',
            color:      'var(--color-text-muted)',
            lineHeight: 1.55,
          }}>
            3–4 char tokens are airports. 5-char tokens are waypoints on the preceding leg.
          </p>
        </div>
      )}
    </div>
  )
}
