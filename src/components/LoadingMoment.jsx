import React from 'react'

export default function LoadingMoment({ onBack }) {
  return (
    <div
      className="flex-1 flex flex-col items-center justify-center gap-5 px-4"
    >
      {/* Spinner */}
      <div
        style={{
          width:          '36px',
          height:         '36px',
          border:         '2px solid var(--color-border)',
          borderTopColor: 'var(--color-brand-gold)',
          borderRadius:   '50%',
          animation:      'preflight-spin 0.75s linear infinite',
          flexShrink:     0,
        }}
      />

      <p
        className="text-body"
        style={{ color: 'var(--color-text-secondary)' }}
      >
        Running preflight check…
      </p>

      <button
        onClick={onBack}
        className="text-small"
        style={{
          background:  'none',
          border:      'none',
          cursor:      'pointer',
          color:       'var(--color-text-muted)',
          fontFamily:  'var(--font-sans)',
          marginTop:   '8px',
        }}
      >
        ← Back to adjust inputs
      </button>

      <style>{`
        @keyframes preflight-spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  )
}
