import React from 'react'

const linkStyle = {
  color:          'var(--color-brand-gold)',
  textDecoration: 'underline',
  fontFamily:     'var(--font-sans)',
  fontSize:       'var(--text-label)',
}

const backBtn = {
  background:  'none',
  border:      'none',
  cursor:      'pointer',
  color:       'var(--color-text-muted)',
  fontFamily:  'var(--font-sans)',
  fontSize:    'var(--text-label)',
  marginTop:   '8px',
}

const retryBtn = {
  height:          '44px',
  padding:         '0 24px',
  backgroundColor: 'var(--color-surface-2)',
  border:          '1px solid var(--color-border)',
  borderRadius:    '8px',
  color:           'var(--color-text-primary)',
  fontFamily:      'var(--font-sans)',
  fontSize:        'var(--text-label)',
  fontWeight:      '500',
  cursor:          'pointer',
}

// error: { type: 'offline' | 'api' | 'partial', message?: string, data?: object }
export default function ErrorMoment({ error, onBack, onRetry }) {
  const isOffline = error?.type === 'offline'
  const isPartial = error?.type === 'partial'

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center px-4 gap-4"
      style={{ maxWidth: '480px', margin: '0 auto', width: '100%', textAlign: 'center' }}
    >
      {isOffline ? (
        <>
          <p
            className="text-display font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            No connection
          </p>
          <p
            className="text-body"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            Weather data is unavailable without an internet connection.
            Connect and try again.
          </p>
        </>
      ) : isPartial ? (
        <>
          <p
            className="text-display font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Partial data returned
          </p>
          <p
            className="text-body"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            Some route intelligence was unavailable. The station weather
            data is complete. Review what's available or go back to retry.
          </p>
          {error?.message && (
            <p
              className="text-small font-mono"
              style={{
                color:           'var(--color-text-muted)',
                backgroundColor: 'var(--color-surface-2)',
                border:          '1px solid var(--color-border)',
                borderRadius:    '6px',
                padding:         '8px 12px',
                width:           '100%',
                textAlign:       'left',
                wordBreak:       'break-word',
              }}
            >
              {error.message}
            </p>
          )}
        </>
      ) : (
        <>
          <p
            className="text-display font-semibold"
            style={{ color: 'var(--color-text-primary)' }}
          >
            Preflight check unavailable
          </p>
          <p
            className="text-body"
            style={{ color: 'var(--color-text-secondary)', lineHeight: 1.6 }}
          >
            The weather data service may be temporarily unavailable or the
            daily request limit has been reached.
          </p>
          {error?.message && (
            <p
              className="text-small font-mono"
              style={{
                color:           'var(--color-text-muted)',
                backgroundColor: 'var(--color-surface-2)',
                border:          '1px solid var(--color-border)',
                borderRadius:    '6px',
                padding:         '8px 12px',
                width:           '100%',
                textAlign:       'left',
                wordBreak:       'break-word',
              }}
            >
              {error.message}
            </p>
          )}
          <a
            href="https://www.1800wxbrief.com"
            target="_blank"
            rel="noopener noreferrer"
            style={linkStyle}
          >
            Get a briefing at 1800wxbrief.com →
          </a>
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
        {onRetry && (
          <button onClick={onRetry} style={retryBtn}>
            Try again
          </button>
        )}
        <button onClick={onBack} style={backBtn}>
          ← Back to adjust inputs
        </button>
      </div>
    </div>
  )
}
