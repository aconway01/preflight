import React from 'react'
import { VFR_ALT_CAP } from '../../hooks/useFlightState'

// Common VFR cruising altitudes in feet MSL, hemispheric rule + 500ft
// (odd thousands + 500 eastbound; even thousands + 500 westbound)
const VFR_SUGGESTIONS  = [3500, 4500, 5500, 6500, 7500, 8500]
const IFR_SUGGESTIONS  = [4000, 6000, 8000, 10000, 12000, 14000]

export default function CruiseAltitude({ value, onChange, isIFR, altCap }) {
  const suggestions = isIFR ? IFR_SUGGESTIONS : VFR_SUGGESTIONS

  function handleInput(e) {
    onChange(e.target.value)
  }

  const numVal = parseInt(value, 10)
  const atCap  = altCap && numVal >= altCap

  return (
    <div className="flex flex-col gap-2 w-full">
      <label
        htmlFor="cruise-alt"
        className="text-label"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Cruise altitude
      </label>

      <div className="relative">
        <input
          id="cruise-alt"
          type="number"
          inputMode="numeric"
          value={value}
          onChange={handleInput}
          placeholder={isIFR ? '8000' : '3500'}
          min={500}
          max={altCap ?? 45000}
          step={500}
          className="w-full rounded-lg border px-4 focus:outline-none font-mono text-label"
          style={{
            height:          '44px',
            backgroundColor: 'var(--color-surface-2)',
            color:           'var(--color-text-primary)',
            borderColor:     'var(--color-border)',
            caretColor:      'var(--color-brand-gold)',
          }}
          onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
          onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
        />
        <span
          className="absolute right-4 top-1/2 -translate-y-1/2 text-small pointer-events-none"
          style={{ color: 'var(--color-text-muted)' }}
        >
          ft MSL
        </span>
      </div>

      {atCap && (
        <span
          className="text-small"
          style={{ color: 'var(--color-marginal)' }}
        >
          VFR altitude capped at {VFR_ALT_CAP.toLocaleString()} ft MSL
        </span>
      )}

      {/* Quick-pick suggestions — static label, scrollable chips */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <span
        className="text-small"
        style={{ color: 'var(--color-text-muted)' }}
      >
        Common:
      </span>
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {suggestions.map(alt => (
          <button
            key={alt}
            onClick={() => onChange(String(alt))}
            className="rounded font-mono transition-colors"
            style={{
              height:          '32px',
              padding:         '0 12px',
              flexShrink:      0,
              fontSize:        'var(--text-label)',
              backgroundColor: value === String(alt) ? 'var(--color-surface)' : 'transparent',
              color:           value === String(alt) ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              border:          `1px solid ${value === String(alt) ? 'var(--color-border)' : 'transparent'}`,
              cursor:          'pointer',
            }}
            aria-pressed={value === String(alt)}
          >
            {alt}
          </button>
        ))}
      </div>
      </div>

      {/* VFR max + hemispheric rule — shown for VFR/Solo, below the input */}
      {!isIFR && (
        <div className="flex flex-col gap-0.5">
          <span
            className="text-small"
            style={{ color: 'var(--color-text-muted)' }}
          >
            VFR max {VFR_ALT_CAP.toLocaleString()} ft MSL
          </span>
          <p
            className="text-small"
            style={{ color: 'var(--color-text-muted)' }}
          >
            Hemispheric rule (FAR 91.159): odd thousands + 500 ft eastbound, even + 500 ft westbound.
            Route direction confirmed in Preflight Summary.
          </p>
        </div>
      )}
      {isIFR && (
        <span
          className="text-small"
          style={{ color: 'var(--color-text-muted)' }}
        >
          Mid-level winds available above 18,000 ft
        </span>
      )}
    </div>
  )
}
