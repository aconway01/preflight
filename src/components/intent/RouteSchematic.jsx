import React, { useState, useRef } from 'react'
import { isValidId, normalizeId } from '../../hooks/useRouteState'

// ── Waypoint diamond ───────────────────────────────────────────

function WaypointDiamond({ id, onRemove }) {
  return (
    // Outer container sized to the visible diamond bounding box (~62px for a 44px rotated square).
    // flexShrink:0 so the LegLine flex column doesn't squash it.
    <div
      className="group"
      style={{ position: 'relative', width: '64px', height: '64px', flexShrink: 0, zIndex: 1 }}
    >
      {/* Diamond shape: 44×44 square rotated 45°, centered in the container */}
      <div
        style={{
          position:        'absolute',
          top:             '50%',
          left:            '50%',
          width:           '44px',
          height:          '44px',
          transform:       'translate(-50%, -50%) rotate(45deg)',
          backgroundColor: 'var(--color-surface-2)',
          border:          '2px solid var(--color-border)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        {/* Counter-rotate so the label reads horizontally */}
        <span
          className="font-mono font-medium whitespace-nowrap"
          style={{
            transform: 'rotate(-45deg)',
            fontSize:  '0.75rem',
            color:     'var(--color-text-primary)',
            lineHeight: 1,
          }}
        >
          {id}
        </span>
      </div>

      {/* Remove button — top-right corner of the bounding box */}
      <button
        onClick={onRemove}
        className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
        style={{
          top:             '-2px',
          right:           '-2px',
          width:           '20px',
          height:          '20px',
          backgroundColor: 'var(--color-surface-2)',
          border:          '1px solid var(--color-border)',
          color:           'var(--color-text-muted)',
          fontSize:        '0.75rem',
          lineHeight:      1,
          cursor:          'pointer',
          zIndex:          2,
        }}
        aria-label={`Remove waypoint ${id}`}
      >
        ×
      </button>
    </div>
  )
}

// ── Vertical leg segment ───────────────────────────────────────

function LegLine({ waypoints, legIndex, onInsertWaypoint, onRemoveWaypoint, onAddStop, onDismissHint }) {
  // openAt: which insertion slot has the chooser open (null = none open).
  // Slots: 0 = before first waypoint, N = after last waypoint.
  const [openAt,   setOpenAt]   = useState(null)
  const [type,     setType]     = useState('stop')
  const [inputVal, setInputVal] = useState('')
  const [error,    setError]    = useState('')
  const skipBlurRef = useRef(false)

  function openChooser(slotIndex) {
    onDismissHint?.()
    setOpenAt(slotIndex)
    setType('stop')
    setInputVal('')
    setError('')
  }

  function dismiss() {
    setOpenAt(null)
    setInputVal('')
    setError('')
  }

  function submit() {
    const raw = inputVal.trim()
    if (!raw) { dismiss(); return }
    if (type === 'waypoint') {
      if (raw.length >= 2 && raw.length <= 5 && /^[A-Z0-9]+$/.test(raw)) {
        onInsertWaypoint(legIndex, openAt, raw)
        dismiss()
      } else {
        setError('2–5 characters (e.g. MAPAX)')
      }
    } else {
      const id = normalizeId(raw)
      if (isValidId(id)) {
        onAddStop(legIndex, id, openAt)
        dismiss()
      } else {
        setError('Unrecognized airport')
      }
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter')  { submit() }
    if (e.key === 'Escape') { skipBlurRef.current = true; dismiss() }
  }

  function handleBlur() {
    if (skipBlurRef.current) { skipBlurRef.current = false; return }
    submit()
  }

  function handleTypeChange(t) {
    setType(t)
    setInputVal('')
    setError('')
  }

  const tab = (active) => ({
    flex:            1,
    height:          '24px',
    fontSize:        'var(--text-small)',
    fontFamily:      'var(--font-sans)',
    fontWeight:      active ? '500' : '400',
    border:          'none',
    borderRadius:    '4px',
    cursor:          'pointer',
    backgroundColor: active ? 'var(--color-border)' : 'transparent',
    color:           active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
    transition:      'background-color 0.1s, color 0.1s',
  })

  const lineSeg = (h) => (
    <div style={{ width: '1px', height: `${h}px`, flexShrink: 0, backgroundColor: 'var(--color-border)' }} />
  )

  // Render the "+" button or chooser card for a given insertion slot.
  function renderSlot(slotIndex) {
    if (openAt === slotIndex) {
      return (
        <div
          style={{
            zIndex:          1,
            display:         'flex',
            flexDirection:   'column',
            gap:             '6px',
            padding:         '6px',
            backgroundColor: 'var(--color-surface-2)',
            border:          '1px solid var(--color-border)',
            borderRadius:    '10px',
            width:           '160px',
          }}
        >
          <div style={{ display: 'flex', gap: '2px', backgroundColor: 'var(--color-base)', borderRadius: '6px', padding: '2px' }}>
            <button style={tab(type === 'stop')}     onMouseDown={() => { skipBlurRef.current = true }} onClick={() => handleTypeChange('stop')}>Stop</button>
            <button style={tab(type === 'waypoint')} onMouseDown={() => { skipBlurRef.current = true }} onClick={() => handleTypeChange('waypoint')}>Waypoint</button>
          </div>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
              <input
                autoFocus
                value={inputVal}
                onChange={e => {
                  const max = type === 'waypoint' ? 5 : 4
                  setInputVal(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, max))
                  setError('')
                }}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
                placeholder={type === 'waypoint' ? 'MAPAX' : 'KXXX'}
                className="font-mono text-center rounded-md"
                style={{
                  width: '100%', height: '32px',
                  fontSize:        'var(--text-label)',
                  backgroundColor: 'var(--color-base)',
                  border:          `1px solid ${error ? 'var(--color-below)' : 'var(--color-brand-gold)'}`,
                  color:           'var(--color-text-primary)',
                  caretColor:      'var(--color-brand-gold)',
                  outline:         'none', boxSizing: 'border-box',
                }}
              />
              {error && <span style={{ fontSize: '0.6rem', color: 'var(--color-below)', whiteSpace: 'nowrap' }}>{error}</span>}
            </div>
            <button
              onMouseDown={() => { skipBlurRef.current = true }}
              onClick={dismiss}
              style={{
                flexShrink: 0, width: '32px', height: '32px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '1px solid var(--color-border)', borderRadius: '6px',
                backgroundColor: 'transparent', color: 'var(--color-text-muted)',
                cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
              }}
              aria-label="Dismiss"
            >×</button>
          </div>
        </div>
      )
    }

    return (
      <button
        onClick={() => openChooser(slotIndex)}
        style={{
          width: '44px', height: '44px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0, fontSize: '1.125rem', fontFamily: 'var(--font-sans)',
          fontWeight: '400', lineHeight: 1,
          border: '1px solid transparent', borderRadius: '50%',
          cursor: 'pointer', backgroundColor: 'transparent',
          color: 'var(--color-text-muted)',
          transition: 'background-color 0.15s, border-color 0.15s, color 0.15s',
        }}
        onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--color-surface-2)'; e.currentTarget.style.borderColor = 'var(--color-border)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)' }}
        aria-label={`Add stop or waypoint at position ${slotIndex}`}
      >+</button>
    )
  }

  // Layout: for N waypoints there are N+1 insertion slots (0..N).
  // Each slot is wrapped in 7px gaps (no line). Waypoints between slots are
  // separated from the next slot by a 10px line segment on each side.
  const slotCount = waypoints.length + 1

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      {lineSeg(16)}
      {Array.from({ length: slotCount }, (_, i) => (
        <React.Fragment key={i}>
          <div style={{ height: '7px' }} />
          {renderSlot(i)}
          <div style={{ height: '7px' }} />
          {i < waypoints.length && (
            <>
              {lineSeg(10)}
              <WaypointDiamond
                id={waypoints[i]}
                onRemove={() => onRemoveWaypoint(legIndex, i)}
              />
              {lineSeg(10)}
            </>
          )}
        </React.Fragment>
      ))}
      {lineSeg(16)}
    </div>
  )
}

// ── Airport / stop node ────────────────────────────────────────

function RouteNode({ id, onRemove }) {
  return (
    <div
      className="group"
      style={{
        position:      'relative',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        zIndex:        1,
      }}
    >
      <div
        style={{
          width:           '52px',
          height:          '52px',
          borderRadius:    '50%',
          backgroundColor: 'var(--color-surface-2)',
          border:          '2px solid var(--color-border)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
        }}
      >
        <span
          className="font-mono font-medium"
          style={{ fontSize: '0.75rem', color: 'var(--color-text-primary)' }}
        >
          {id}
        </span>
      </div>

      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full"
          style={{
            top:             '-4px',
            right:           '-4px',
            width:           '20px',
            height:          '20px',
            backgroundColor: 'var(--color-surface-2)',
            border:          '1px solid var(--color-border)',
            color:           'var(--color-text-muted)',
            fontSize:        '0.8rem',
            lineHeight:      1,
            cursor:          'pointer',
            zIndex:          2,
          }}
          aria-label={`Remove stop ${id}`}
        >
          ×
        </button>
      )}
    </div>
  )
}

// ── Main schematic ─────────────────────────────────────────────

export default function RouteSchematic({ legs, onInsertWaypoint, onRemoveWaypoint, onAddStop, onRemoveStop }) {
  const [hintDismissed, setHintDismissed] = useState(false)

  if (!legs || legs.length === 0) return null

  const nodes = [legs[0].from, ...legs.map(l => l.to)]
  const showHint = !hintDismissed && legs.length === 1 && legs[0].waypoints.length === 0

  return (
    <div
      style={{
        width:         '100%',
        display:       'flex',
        flexDirection: 'column',
        alignItems:    'center',
        padding:       '8px 0',
      }}
    >
      {nodes.map((id, i) => (
        <React.Fragment key={i}>
          <RouteNode
            id={id}
            onRemove={i > 0 && i < nodes.length - 1 ? () => onRemoveStop(i - 1) : undefined}
          />
          {i < legs.length && (
            <LegLine
              waypoints={legs[i].waypoints}
              legIndex={i}
              onInsertWaypoint={onInsertWaypoint}
              onRemoveWaypoint={onRemoveWaypoint}
              onAddStop={onAddStop}
              onDismissHint={() => setHintDismissed(true)}
            />
          )}
        </React.Fragment>
      ))}

      {showHint && (
        <p
          className="text-small"
          style={{ color: 'var(--color-text-muted)', marginTop: '4px', textAlign: 'center' }}
        >
          Tap + to add a stop or waypoint
        </p>
      )}
    </div>
  )
}
