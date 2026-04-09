import React, { useState, useRef, useCallback } from 'react'
import IntentMoment      from './components/intent/IntentMoment'
import LoadingMoment     from './components/LoadingMoment'
import ErrorMoment       from './components/ErrorMoment'
import ReviewMoment      from './components/ReviewMoment'
import DispatchMoment    from './components/DispatchMoment'
import LimitationsModal  from './components/LimitationsModal'
import { buildPreflightUrl } from './utils/buildPreflightUrl'

export default function App() {
  const [appState,        setAppState]       = useState('intent')   // 'intent'|'loading'|'error'|'review'|'dispatch'
  const [weatherData,     setWeatherData]    = useState(null)
  const [apiError,        setApiError]       = useState(null)
  const [showLimitations, setShowLimitations] = useState(false)
  const [lastPayload,     setLastPayload]    = useState(null)

  const abortRef        = useRef(null)
  const reviewScrollRef = useRef(0)

  const handleSubmit = useCallback(async (payload) => {
    // Connectivity check
    if (!navigator.onLine) {
      setApiError({ type: 'offline' })
      setAppState('error')
      return
    }

    // Abort any previous in-flight request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLastPayload(payload)
    setAppState('loading')
    setApiError(null)

    try {
      const url = buildPreflightUrl(payload)
      const res = await fetch(url, { signal: controller.signal })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      // Treat partial responses gracefully — show review with a warning
      if (data?.status === 'partial') {
        setWeatherData(data)
        setApiError({ type: 'partial', message: data?.error || null, data })
        setAppState('error')
        return
      }

      setWeatherData(data)
      setAppState('review')
    } catch (err) {
      if (err.name === 'AbortError') return   // user navigated back — ignore
      setApiError({ type: 'api', message: err.message })
      setAppState('error')
    }
  }, [])

  const handleBack = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setAppState('intent')
    setApiError(null)
  }, [])

  const handleRetry = useCallback(() => {
    // Return to intent so the pilot can re-submit (or adjust inputs first)
    setAppState('intent')
    setApiError(null)
  }, [])

  const handleDispatch = useCallback(() => {
    reviewScrollRef.current = window.scrollY
    setAppState('dispatch')
    window.scrollTo(0, 0)
  }, [])

  const handleBackFromDispatch = useCallback(() => {
    setAppState('review')
    requestAnimationFrame(() => window.scrollTo(0, reviewScrollRef.current))
  }, [])

  return (
    <div
      className="min-h-dvh flex flex-col font-sans"
      style={{ backgroundColor: 'var(--color-base)', color: 'var(--color-text-primary)' }}
    >

      {/* Persistent header */}
      <header
        className="flex items-center px-4 py-3 flex-shrink-0"
        style={{ borderBottom: '1px solid var(--color-border)' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}LogoTransparent.png`}
          alt="Central Aviation"
          className="h-12 w-auto"
          style={{ filter: 'brightness(1.8) contrast(1.1)' }}
        />
      </header>

      {/* Moment content */}

      {/* IntentMoment stays mounted at all times so all hook state is preserved across
          loading / review / error transitions. Only the wrapper visibility changes. */}
      <div style={{ display: appState === 'intent' ? 'contents' : 'none' }}>
        <IntentMoment onSubmit={handleSubmit} />
      </div>

      {appState === 'loading' && (
        <LoadingMoment onBack={handleBack} />
      )}
      {appState === 'error' && (
        <ErrorMoment
          error={apiError}
          onBack={handleBack}
          onRetry={handleRetry}
        />
      )}
      {/* ReviewMoment stays mounted across review↔dispatch transitions so section
          expand/collapse state and scroll position are naturally preserved. */}
      {weatherData && (appState === 'review' || appState === 'dispatch') && (
        <div style={{ display: appState === 'review' ? 'contents' : 'none' }}>
          <ReviewMoment
            data={weatherData}
            onBack={handleBack}
            onDispatch={handleDispatch}
            readiness={lastPayload?.readiness}
            cruiseAlt={lastPayload?.flight?.cruiseAlt}
            isIFR={!!lastPayload?.flight?.isIFR}
            payload={lastPayload}
          />
        </div>
      )}
      {appState === 'dispatch' && (
        <DispatchMoment
          data={weatherData}
          payload={lastPayload}
          onBack={handleBackFromDispatch}
        />
      )}

      {/* Persistent footer — visible on all moments */}
      <footer
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <p className="text-small text-center">
          <button
            onClick={() => setShowLimitations(true)}
            style={{
              background:     'none',
              border:         'none',
              cursor:         'pointer',
              color:          'var(--color-text-muted)',
              fontFamily:     'var(--font-sans)',
              fontSize:       'var(--text-small)',
              textDecoration: 'underline',
              textDecorationColor: 'var(--color-border)',
              textUnderlineOffset: '3px',
              padding:        '4px 0',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            Known limitations of this tool
          </button>
        </p>
      </footer>

      {showLimitations && (
        <LimitationsModal onClose={() => setShowLimitations(false)} />
      )}
    </div>
  )
}
