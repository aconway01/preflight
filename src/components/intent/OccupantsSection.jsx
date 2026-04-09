import React, { useState } from 'react'

const ROLES = ['SIC', 'CFI', 'DPE', 'Student', 'Safety Pilot', 'Passenger']

const baseInput = {
  height:          '36px',
  backgroundColor: 'var(--color-base)',
  color:           'var(--color-text-primary)',
  border:          '1px solid var(--color-border)',
  borderRadius:    '6px',
  padding:         '0 10px',
  fontSize:        'var(--text-label)',
  fontFamily:      'var(--font-sans)',
  outline:         'none',
  boxSizing:       'border-box',
  width:           '100%',
}

const selectStyle = {
  ...baseInput,
  cursor:            'pointer',
  appearance:        'none',
  WebkitAppearance:  'none',
  backgroundImage:   `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23888' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
  backgroundRepeat:  'no-repeat',
  backgroundPosition:'right 10px center',
  paddingRight:      '28px',
  colorScheme:       'dark',
}

export default function OccupantsSection({ occupants, onAdd, onUpdate, onRemove }) {
  const [open, setOpen] = useState(false)

  function handleOpen() {
    setOpen(true)
    if (occupants.length === 0) onAdd()
  }

  if (!open) {
    return (
      <button
        onClick={handleOpen}
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
        Add occupants
      </button>
    )
  }

  return (
    <div
      className="w-full rounded-lg"
      style={{ backgroundColor: 'var(--color-surface-2)', border: '1px solid var(--color-border)', padding: '16px' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span className="text-label font-medium" style={{ color: 'var(--color-text-secondary)' }}>Occupants</span>
        <button
          onClick={() => setOpen(false)}
          className="text-small"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', padding: '4px' }}
        >
          Collapse
        </button>
      </div>

      {/* Occupant rows */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {occupants.map((occ, idx) => (
          <div
            key={occ.id}
            style={{
              display:         'flex',
              flexDirection:   'column',
              gap:             '8px',
              padding:         '12px',
              backgroundColor: 'var(--color-base)',
              borderRadius:    '8px',
              border:          '1px solid var(--color-border)',
            }}
          >
            {/* Row header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
                Occupant {idx + 1}
              </span>
              <button
                onClick={() => onRemove(occ.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--color-text-muted)', fontSize: '1.1rem', lineHeight: 1, padding: '4px',
                }}
                aria-label={`Remove occupant ${idx + 1}`}
              >×</button>
            </div>

            {/* Name */}
            <input
              type="text"
              value={occ.name}
              onChange={e => onUpdate(occ.id, 'name', e.target.value)}
              placeholder="Name (optional)"
              style={baseInput}
              onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
              onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
            />

            {/* Role + Certificate */}
            <div className="occ-role-cert" style={{ display: 'flex', gap: '8px' }}>
              <select
                value={occ.role}
                onChange={e => onUpdate(occ.id, 'role', e.target.value)}
                style={{ ...selectStyle, flex: '0 0 auto', width: '132px' }}
              >
                {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
              <input
                type="text"
                value={occ.cert}
                onChange={e => onUpdate(occ.id, 'cert', e.target.value)}
                placeholder="Certificate # (optional)"
                style={{ ...baseInput, flex: 1 }}
                onFocus={e => { e.target.style.borderColor = 'var(--color-brand-gold)' }}
                onBlur={e =>  { e.target.style.borderColor = 'var(--color-border)' }}
              />
            </div>
            <style>{`
              @media (max-width: 639px) {
                .occ-role-cert { flex-direction: column; }
                .occ-role-cert > * { width: 100% !important; flex: none !important; }
              }
            `}</style>
          </div>
        ))}
      </div>

      {/* Add another */}
      <button
        onClick={onAdd}
        style={{
          marginTop:       occupants.length > 0 ? '10px' : '0',
          width:           '100%',
          height:          '44px',
          backgroundColor: 'transparent',
          border:          '1px dashed var(--color-border)',
          borderRadius:    '6px',
          cursor:          'pointer',
          color:           'var(--color-text-muted)',
          fontSize:        'var(--text-label)',
          fontFamily:      'var(--font-sans)',
          display:         'flex',
          alignItems:      'center',
          justifyContent:  'center',
          gap:             '6px',
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; e.currentTarget.style.color = 'var(--color-text-secondary)' }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)';    e.currentTarget.style.color = 'var(--color-text-muted)' }}
      >
        <span>+</span>
        {occupants.length > 0 ? 'Add another' : 'Add occupant'}
      </button>
    </div>
  )
}
