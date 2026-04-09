import React from 'react'
import { FLIGHT_MODES } from '../../hooks/useFlightState'

export default function FlightModeSelect({ value, onChange }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <span
        className="text-label"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Flight rules
      </span>
      <div className="flex gap-2 w-full">
        {FLIGHT_MODES.map(mode => {
          const selected = value === mode.id
          return (
            <button
              key={mode.id}
              onClick={() => onChange(mode.id)}
              className="flex-1 rounded-lg font-medium text-label transition-colors"
              style={{
                height:          '44px',
                backgroundColor: selected ? 'var(--color-brand-gold)' : 'var(--color-surface-2)',
                color:           selected ? 'var(--color-base)'       : 'var(--color-text-secondary)',
                border:          selected ? '2px solid var(--color-brand-gold)' : '1px solid var(--color-border)',
                cursor:          'pointer',
              }}
              aria-pressed={selected}
            >
              {mode.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
