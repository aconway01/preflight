import React, { useState, useRef, useCallback } from 'react'
import LoadingMoment     from './components/LoadingMoment'
import ErrorMoment       from './components/ErrorMoment'
import DispatchMoment    from './components/DispatchMoment'
import LimitationsModal  from './components/LimitationsModal'

// V2 state machine
// 'route-entry' → 'fetching' → 'planning' → 'finalizing' → 'acknowledging'
//               → 'context' → 'summary' → 'dispatch'
// Any state → 'error' on fetch failure
// 'planning' → 'refreshing' → 'planning' on route modification + refresh

export default function App() {
  const [appState,        setAppState]       = useState('route-entry')
  const [weatherData,     setWeatherData]    = useState(null)
  const [apiError,        setApiError]       = useState(null)
  const [showLimitations, setShowLimitations] = useState(false)
  const [lastPayload,     setLastPayload]    = useState(null)

  const abortRef        = useRef(null)
  const summaryScrollRef = useRef(0)

  // ── Fetch helper — used by both initial fetch and finalization ───
  const runFetch = useCallback(async (url, payload, { onSuccess, transitionState }) => {
    if (!navigator.onLine) {
      setApiError({ type: 'offline' })
      setAppState('error')
      return
    }
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    setLastPayload(payload)
    setAppState(transitionState)
    setApiError(null)

    try {
      const res = await fetch(url, { signal: controller.signal })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      if (data?.status === 'partial') {
        setWeatherData(data)
        setApiError({ type: 'partial', message: data?.error || null, data })
        setAppState('error')
        return
      }
      onSuccess(data)
    } catch (err) {
      if (err.name === 'AbortError') return
      setApiError({ type: 'api', message: err.message })
      setAppState('error')
    }
  }, [])

  // route-entry → fetching → planning
  const handleRouteCommit = useCallback((url, payload) => {
    runFetch(url, payload, {
      transitionState: 'fetching',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('planning')
      },
    })
  }, [runFetch])

  // planning → refreshing → planning
  const handleRefresh = useCallback((url, payload) => {
    runFetch(url, payload, {
      transitionState: 'refreshing',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('planning')
      },
    })
  }, [runFetch])

  // planning → finalizing → acknowledging
  const handleFinalize = useCallback((url, payload) => {
    runFetch(url, payload, {
      transitionState: 'finalizing',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('acknowledging')
      },
    })
  }, [runFetch])

  // acknowledging → context
  const handleAcknowledge = useCallback(() => setAppState('context'), [])

  // context → summary
  const handleContextContinue = useCallback(() => setAppState('summary'), [])

  // summary → dispatch
  const handleDispatch = useCallback(() => {
    summaryScrollRef.current = window.scrollY
    setAppState('dispatch')
    window.scrollTo(0, 0)
  }, [])

  // summary ← dispatch
  const handleBackFromDispatch = useCallback(() => {
    setAppState('summary')
    requestAnimationFrame(() => window.scrollTo(0, summaryScrollRef.current))
  }, [])

  // summary → planning (adjust plan)
  const handleAdjustPlan = useCallback(() => setAppState('planning'), [])

  // Back to route entry from any state
  const handleBackToRouteEntry = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
      abortRef.current = null
    }
    setAppState('route-entry')
    setApiError(null)
  }, [])

  const handleRetry = useCallback(() => {
    setAppState('route-entry')
    setApiError(null)
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

      {(appState === 'route-entry') && (
        <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', paddingTop: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)' }}>
            Route entry — Stage 2
          </p>
        </div>
      )}

      {(appState === 'fetching' || appState === 'refreshing' || appState === 'finalizing') && (
        <LoadingMoment onBack={handleBackToRouteEntry} />
      )}

      {appState === 'error' && (
        <ErrorMoment
          error={apiError}
          onBack={handleBackToRouteEntry}
          onRetry={handleRetry}
        />
      )}

      {appState === 'planning' && (
        <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', paddingTop: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)' }}>
            Planning surface — Stage 2
          </p>
        </div>
      )}

      {appState === 'acknowledging' && (
        <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', paddingTop: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)' }}>
            Acknowledgement — Stage 6
          </p>
        </div>
      )}

      {appState === 'context' && (
        <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', paddingTop: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)' }}>
            Context — Stage 6
          </p>
        </div>
      )}

      {appState === 'summary' && (
        <div className="flex-1 flex flex-col px-4" style={{ maxWidth: '640px', margin: '0 auto', width: '100%', paddingTop: '48px' }}>
          <p style={{ color: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)' }}>
            Summary — Stage 6
          </p>
        </div>
      )}

      {/* DispatchMoment stays mounted across summary↔dispatch transitions */}
      {weatherData && (appState === 'summary' || appState === 'dispatch') && (
        <div style={{ display: appState === 'dispatch' ? 'contents' : 'none' }}>
          <DispatchMoment
            data={weatherData}
            payload={lastPayload}
            onBack={handleBackFromDispatch}
          />
        </div>
      )}

      {/* Persistent footer */}
      <footer
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: '1px solid var(--color-border)' }}
      >
        <p className="text-small text-center">
          <button
            onClick={() => setShowLimitations(true)}
            style={{
              background:          'none',
              border:              'none',
              cursor:              'pointer',
              color:               'var(--color-text-muted)',
              fontFamily:          'var(--font-sans)',
              fontSize:            'var(--text-small)',
              textDecoration:      'underline',
              textDecorationColor: 'var(--color-border)',
              textUnderlineOffset: '3px',
              padding:             '4px 0',
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
