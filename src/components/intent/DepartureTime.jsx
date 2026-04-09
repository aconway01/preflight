import React from 'react'
import DateInput from '../shared/DateInput'

const timeFieldStyle = {
  width:           '100%',
  height:          '44px',
  backgroundColor: 'var(--color-surface-2)',
  color:           'var(--color-text-primary)',
  border:          '1px solid var(--color-border)',
  borderRadius:    '8px',
  padding:         '0 12px',
  fontSize:        'var(--text-label)',
  fontFamily:      'var(--font-sans)',
  colorScheme:     'dark',
  outline:         'none',
  boxSizing:       'border-box',
}

export default function DepartureTime({ value, onChange, utcLabel }) {
  // value is "YYYY-MM-DDTHH:mm" — split for separate inputs
  const datePart = value ? value.slice(0, 10) : ''
  const timePart = value ? value.slice(11, 16) : ''

  function handleDateChange(newDate) {
    const time = timePart || '00:00'
    onChange(newDate ? `${newDate}T${time}` : '')
  }

  function handleTimeChange(newTime) {
    const date = datePart || new Date().toISOString().slice(0, 10)
    onChange(newTime ? `${date}T${newTime}` : '')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
      <label className="text-label" style={{ color: 'var(--color-text-secondary)' }}>
        Departure date &amp; time
      </label>

      {/* Date — full width, custom text input */}
      <DateInput value={datePart} onChange={handleDateChange} />

      {/* Time — full width */}
      <input
        type="time"
        value={timePart}
        onChange={e => handleTimeChange(e.target.value)}
        style={timeFieldStyle}
        onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
        onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
      />

      {/* Zulu — left-aligned below time */}
      {utcLabel && (
        <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
          {utcLabel}
        </span>
      )}
    </div>
  )
}
