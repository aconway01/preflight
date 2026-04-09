import React, { useEffect } from 'react'
import { CA_DATA } from '../data/config'

const SEVERITY_STYLE = {
  critical: {
    badge:      { backgroundColor: 'var(--color-below)',    color: '#0D1120' },
    itemBorder: 'var(--color-below)',
    label:      'Critical',
  },
  warn: {
    badge:      { backgroundColor: 'var(--color-marginal)', color: '#0D1120' },
    itemBorder: 'var(--color-marginal)',
    label:      'Warning',
  },
  info: {
    badge:      { backgroundColor: 'var(--color-border)',   color: 'var(--color-text-secondary)' },
    itemBorder: 'var(--color-border)',
    label:      'Info',
  },
}

export default function LimitationsModal({ onClose }) {
  // Close on Escape
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return (
    <div
      style={{
        position:        'fixed',
        inset:           0,
        zIndex:          1000,
        backgroundColor: 'rgba(0, 0, 0, 0.72)',
        display:         'flex',
        alignItems:      'flex-end',
        justifyContent:  'center',
        padding:         '0',
      }}
      onClick={onClose}
      aria-modal="true"
      role="dialog"
      aria-label="Known Limitations"
    >
      {/* Panel — stop click propagation so tapping panel doesn't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width:           '100%',
          maxWidth:        '640px',
          maxHeight:       '88dvh',
          backgroundColor: 'var(--color-surface)',
          border:          '1px solid var(--color-border)',
          borderRadius:    '16px 16px 0 0',
          display:         'flex',
          flexDirection:   'column',
          overflow:        'hidden',
        }}
        className="limitations-panel"
      >
        {/* Header */}
        <div
          style={{
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'space-between',
            padding:        '16px 20px',
            borderBottom:   '1px solid var(--color-border)',
            flexShrink:     0,
          }}
        >
          <span
            className="text-label font-medium"
            style={{ color: 'var(--color-text-secondary)', letterSpacing: '0.05em' }}
          >
            KNOWN LIMITATIONS
          </span>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              color:       'var(--color-text-muted)',
              fontSize:    '1.25rem',
              lineHeight:  1,
              padding:     '4px 8px',
              fontFamily:  'var(--font-sans)',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            ×
          </button>
        </div>

        {/* Scrollable content */}
        <div
          style={{
            overflowY:  'auto',
            flex:       '1 1 auto',
            padding:    '20px',
            display:    'flex',
            flexDirection: 'column',
            gap:        '28px',
          }}
        >
          {CA_DATA.LIMITATIONS.map(group => {
            const sev = SEVERITY_STYLE[group.severity] ?? SEVERITY_STYLE.info
            return (
              <div key={group.category}>
                {/* Category header */}
                <div
                  style={{
                    display:      'flex',
                    alignItems:   'center',
                    gap:          '10px',
                    marginBottom: '12px',
                  }}
                >
                  <span
                    className="text-label font-medium"
                    style={{ color: 'var(--color-text-primary)' }}
                  >
                    {group.category}
                  </span>
                  <span
                    style={{
                      ...sev.badge,
                      fontSize:     '0.6rem',
                      fontWeight:   600,
                      padding:      '2px 6px',
                      borderRadius: '4px',
                      letterSpacing:'0.04em',
                      textTransform:'uppercase',
                      flexShrink:   0,
                    }}
                  >
                    {sev.label}
                  </span>
                </div>

                {/* Items */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {group.items.map(item => (
                    <div
                      key={item.title}
                      style={{
                        borderLeft:      `3px solid ${sev.itemBorder}`,
                        paddingLeft:     '12px',
                        display:         'flex',
                        flexDirection:   'column',
                        gap:             '4px',
                      }}
                    >
                      <span
                        className="text-label font-medium"
                        style={{ color: 'var(--color-text-primary)' }}
                      >
                        {item.title}
                      </span>
                      <p
                        className="text-small"
                        style={{
                          color:      'var(--color-text-secondary)',
                          lineHeight: 1.55,
                          margin:     0,
                        }}
                      >
                        {item.detail}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {/* Footer note */}
          <p
            className="text-small"
            style={{ color: 'var(--color-text-muted)', borderTop: '1px solid var(--color-border)', paddingTop: '16px', lineHeight: 1.55 }}
          >
            This tool is a planning aid only and does not constitute an official FAA weather
            briefing. Always obtain a standard briefing from 1800wxbrief.com before flight.
          </p>
        </div>
      </div>

      {/* Desktop: rounded all sides, aligned center not bottom */}
      <style>{`
        @media (min-width: 640px) {
          .limitations-panel {
            border-radius: 12px !important;
            margin-bottom: 0;
          }
        }
      `}</style>
    </div>
  )
}
