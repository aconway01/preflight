import React, { useState, useEffect } from 'react'
import { CA_DATA } from '../../data/config'

const FIELD_REFS = {
  minVis:         'FAR 91.155',
  minCeil:        'FAR 91.155',
  maxXwd:         'No FAA limit',
  maxTotalWind:   'No FAA limit',
  maxGust:        'No FAA limit',
  cautionDA:      'No FAA limit',
  noGoDA:         'No FAA limit',
  maxPressureAlt: 'FAR 91.211',
}

const MODE_LABELS = {
  vfr_day:   'VFR Day',
  vfr_night: 'VFR Night',
  ifr:       'IFR',
  solo_day:  'Solo Day',
  solo_night:'Solo Night',
}

function activeMode(flightMode, isNight) {
  if (flightMode === 'ifr')          return 'ifr'
  if (flightMode === 'student_solo') return isNight ? 'solo_night' : 'solo_day'
  return isNight ? 'vfr_night' : 'vfr_day'
}

// ── Small numeric input with local draft + blur commit ──────────
function MinInput({ value, disabled, onCommit }) {
  const [draft, setDraft] = useState(value != null ? String(value) : '')

  useEffect(() => {
    setDraft(value != null ? String(value) : '')
  }, [value])

  const cellStyle = {
    width:        '100%',
    height:       '32px',
    borderRadius: '4px',
    fontSize:     '0.7rem',
    fontFamily:   'var(--font-mono)',
    textAlign:    'center',
    boxSizing:    'border-box',
    lineHeight:   1,
  }

  if (disabled) {
    return (
      <div style={{ ...cellStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
        {value != null ? value : '—'}
      </div>
    )
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={draft}
      onChange={e => setDraft(e.target.value.replace(/[^0-9.]/g, '').replace(/^(\d*\.?\d*).*$/, '$1'))}
      onBlur={e => onCommit(e.target.value.trim())}
      onFocus={e => e.target.style.borderColor = 'var(--color-brand-gold)'}
      style={{
        ...cellStyle,
        backgroundColor: 'var(--color-base)',
        color:           'var(--color-text-primary)',
        border:          '1px solid var(--color-border)',
        padding:         '0 4px',
        outline:         'none',
        caretColor:      'var(--color-brand-gold)',
      }}
      onBlurCapture={e => { e.target.style.borderColor = 'var(--color-border)' }}
    />
  )
}

// ── Main section ────────────────────────────────────────────────

export default function MinimumsSection({
  flightMode,
  departureIsNight,
  schoolMinsEnabled, setSchoolMinsEnabled,
  schoolMins,  setSchoolField,
  personalMins, setPersonalField,
  getFloor,
}) {
  const [open, setOpen] = useState(false)

  const modeKey = activeMode(flightMode, departureIsNight)
  const fields  = CA_DATA.MINIMUMS_FIELDS.filter(f => f.modes.includes(modeKey))

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-lg text-label font-medium text-left"
        style={{
          padding:         '10px 16px',
          backgroundColor: 'transparent',
          border:          '1px solid var(--color-border)',
          color:           'var(--color-text-secondary)',
          cursor:          'pointer',
          display:         'flex',
          alignItems:      'center',
          gap:             '8px',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)' }}
      >
        <span style={{ color: 'var(--color-text-muted)', lineHeight: 1 }}>+</span>
        Set minimums
      </button>
    )
  }

  return (
    <div
      className="w-full rounded-lg"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '16px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className="text-label font-medium" style={{ color: 'var(--color-text-secondary)' }}>Minimums</span>
          <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>{MODE_LABELS[modeKey]}</span>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="text-small"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', padding: '4px' }}
        >
          Collapse
        </button>
      </div>

      {/* School minimums toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: schoolMinsEnabled ? '16px' : '8px' }}>
        <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
          Apply school/instructor minimums
        </span>
        <div style={{ display: 'flex', borderRadius: '6px', border: '1px solid var(--color-border)', overflow: 'hidden', flexShrink: 0 }}>
          {[['Yes', true], ['No', false]].map(([label, val]) => {
            const active = schoolMinsEnabled === val
            return (
              <button
                key={label}
                onClick={() => setSchoolMinsEnabled(val)}
                style={{
                  height:          '32px',
                  padding:         '0 14px',
                  backgroundColor: active ? 'var(--color-surface-1, var(--color-border))' : 'transparent',
                  color:           active ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
                  border:          'none',
                  borderLeft:      label === 'No' ? '1px solid var(--color-border)' : 'none',
                  cursor:          'pointer',
                  fontFamily:      'var(--font-sans)',
                  fontSize:        'var(--text-label)',
                  fontWeight:      active ? '500' : '400',
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {!schoolMinsEnabled && (
        <p className="text-small" style={{ color: 'var(--color-text-muted)', marginBottom: '16px' }}>
          FAA regulatory floors apply as the minimum constraint.
        </p>
      )}

      {/* ── Desktop grid layout (hidden on mobile) ── */}
      <div className="mins-desktop">
        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: schoolMinsEnabled ? 'minmax(0,1fr) 44px 68px 68px 28px' : 'minmax(0,1fr) 44px 68px 28px', gap: '4px 8px', marginBottom: '6px', alignItems: 'center' }}>
          <div />
          <span className="text-small" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>FAA</span>
          {schoolMinsEnabled && (
            <span className="text-small" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>School</span>
          )}
          <span className="text-small" style={{ color: 'var(--color-text-muted)', textAlign: 'center' }}>Personal</span>
          <div />
        </div>

        {/* Divider */}
        <div style={{ height: '1px', backgroundColor: 'var(--color-border)', marginBottom: '6px' }} />

        {/* Field rows */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {fields.map(field => {
            const faaVal      = CA_DATA.FAA_MINIMUMS[modeKey]?.[field.key] ?? null
            const schoolVal   = schoolMins[modeKey]?.[field.key] ?? null
            const personalVal = personalMins[modeKey]?.[field.key] ?? null
            const floor       = getFloor(modeKey, field.key)

            return (
              <div
                key={field.key}
                style={{
                  display:    'grid',
                  gridTemplateColumns: schoolMinsEnabled ? 'minmax(0,1fr) 44px 68px 68px 28px' : 'minmax(0,1fr) 44px 68px 28px',
                  gap:        '4px 8px',
                  alignItems: 'center',
                  minHeight:  '36px',
                }}
              >
                <span
                  className="text-small"
                  style={{ color: 'var(--color-text-secondary)', cursor: field.tip ? 'help' : 'default' }}
                  title={field.tip ?? undefined}
                >
                  {field.label}
                  {FIELD_REFS[field.key] && (
                    <span style={{ marginLeft: '6px', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                      {FIELD_REFS[field.key]}
                    </span>
                  )}
                </span>

                <span
                  className="font-mono text-small"
                  style={{ color: 'var(--color-text-muted)', textAlign: 'center', fontSize: '0.7rem' }}
                >
                  {faaVal != null ? faaVal : '—'}
                </span>

                {schoolMinsEnabled && (
                  <MinInput
                    value={schoolVal}
                    onCommit={val => setSchoolField(modeKey, field.key, val)}
                  />
                )}

                <MinInput
                  value={personalVal}
                  onCommit={val => {
                    if (val === '') { setPersonalField(modeKey, field.key, ''); return }
                    const num = parseFloat(val)
                    if (isNaN(num)) { setPersonalField(modeKey, field.key, ''); return }
                    if (floor != null) {
                      if (field.direction === 'min' && num < floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                      if (field.direction === 'max' && num > floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                    }
                    setPersonalField(modeKey, field.key, val)
                  }}
                />

                <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>{field.unit}</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Mobile card layout (hidden on desktop) ── */}
      <div className="mins-mobile">
        {fields.map(field => {
          const faaVal      = CA_DATA.FAA_MINIMUMS[modeKey]?.[field.key] ?? null
          const schoolVal   = schoolMins[modeKey]?.[field.key] ?? null
          const personalVal = personalMins[modeKey]?.[field.key] ?? null
          const floor       = getFloor(modeKey, field.key)

          return (
            <div
              key={field.key}
              style={{
                padding:         '10px 12px',
                backgroundColor: 'var(--color-base)',
                borderRadius:    '6px',
                border:          '1px solid var(--color-border)',
                display:         'flex',
                flexDirection:   'column',
                gap:             '8px',
              }}
            >
              {/* Field label + ref */}
              <span
                className="text-small"
                style={{ color: 'var(--color-text-secondary)', cursor: field.tip ? 'help' : 'default' }}
                title={field.tip ?? undefined}
              >
                {field.label}
                {FIELD_REFS[field.key] && (
                  <span style={{ marginLeft: '6px', color: 'var(--color-text-muted)', opacity: 0.7 }}>
                    {FIELD_REFS[field.key]}
                  </span>
                )}
              </span>

              {/* Inputs row */}
              {schoolMinsEnabled ? (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
                  {/* FAA minimum */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>FAA minimum</span>
                    <div style={{
                      height:          '32px',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      borderRadius:    '4px',
                      border:          '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      fontFamily:      'var(--font-mono)',
                      fontSize:        '0.7rem',
                      color:           'var(--color-text-primary)',
                      boxSizing:       'border-box',
                    }}>
                      {faaVal != null ? faaVal : '—'}
                    </div>
                  </div>
                  {/* School */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>School</span>
                    <MinInput
                      value={schoolVal}
                      onCommit={val => setSchoolField(modeKey, field.key, val)}
                    />
                  </div>
                  {/* Personal */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>Personal</span>
                    <MinInput
                      value={personalVal}
                      onCommit={val => {
                        if (val === '') { setPersonalField(modeKey, field.key, ''); return }
                        const num = parseFloat(val)
                        if (isNaN(num)) { setPersonalField(modeKey, field.key, ''); return }
                        if (floor != null) {
                          if (field.direction === 'min' && num < floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                          if (field.direction === 'max' && num > floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                        }
                        setPersonalField(modeKey, field.key, val)
                      }}
                    />
                  </div>
                  <span className="text-small" style={{ color: 'var(--color-text-muted)', paddingBottom: '6px' }}>{field.unit}</span>
                </div>
              ) : (
                /* School off: FAA minimum + Personal side by side */
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>FAA minimum</span>
                    <div style={{
                      height:          '32px',
                      display:         'flex',
                      alignItems:      'center',
                      justifyContent:  'center',
                      borderRadius:    '4px',
                      border:          '1px solid var(--color-border)',
                      backgroundColor: 'var(--color-surface)',
                      fontFamily:      'var(--font-mono)',
                      fontSize:        '0.7rem',
                      color:           'var(--color-text-primary)',
                      boxSizing:       'border-box',
                    }}>
                      {faaVal != null ? faaVal : '—'}
                    </div>
                  </div>
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>Personal</span>
                    <MinInput
                      value={personalVal}
                      onCommit={val => {
                        if (val === '') { setPersonalField(modeKey, field.key, ''); return }
                        const num = parseFloat(val)
                        if (isNaN(num)) { setPersonalField(modeKey, field.key, ''); return }
                        if (floor != null) {
                          if (field.direction === 'min' && num < floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                          if (field.direction === 'max' && num > floor) { setPersonalField(modeKey, field.key, String(floor)); return }
                        }
                        setPersonalField(modeKey, field.key, val)
                      }}
                    />
                  </div>
                  <span className="text-small" style={{ color: 'var(--color-text-muted)', paddingBottom: '6px' }}>{field.unit}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>

      <style>{`
        .mins-desktop { display: block; }
        .mins-mobile  { display: none;  }
        @media (max-width: 639px) {
          .mins-desktop { display: none; }
          .mins-mobile  { display: flex; flex-direction: column; gap: 8px; }
        }
      `}</style>

      {/* Footer note */}
      <p className="text-small" style={{ color: 'var(--color-text-muted)', marginTop: '12px' }}>
        Personal minimums are hard-blocked below the active floor (FAA + school). Session-only — not persisted.
      </p>
    </div>
  )
}
