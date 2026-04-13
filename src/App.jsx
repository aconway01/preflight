import React, { useState, useRef, useCallback } from 'react'
import LoadingMoment     from './components/LoadingMoment'
import ErrorMoment       from './components/ErrorMoment'
import DispatchMoment    from './components/DispatchMoment'
import LimitationsModal  from './components/LimitationsModal'
import RouteEntry        from './components/planning/RouteEntry'
import FetchingMoment    from './components/planning/FetchingMoment'
import PlanningMoment    from './components/planning/PlanningMoment'
import { useRouteState } from './hooks/useRouteState'
import { buildAllLegUrls } from './utils/buildLegUrl'

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
  const [routeLegs,       setRouteLegs]      = useState([])
  const [routeModified,   setRouteModified]  = useState(false)

  const routeState   = useRouteState()
  const abortRef        = useRef(null)
  const summaryScrollRef = useRef(0)

  // ── Fetch helper — used by both initial fetch and finalization ───
  const runFetch = useCallback(async (urls, payload, { onSuccess, transitionState }) => {
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
      // For V2, fetch all legs in parallel and merge results.
      // For single-leg routes (most common), there is one URL.
      const urlArray = Array.isArray(urls) ? urls : [urls]
      const responses = await Promise.all(
        urlArray.map(url => fetch(url, { signal: controller.signal }))
      )

      const failed = responses.find(r => !r.ok)
      if (failed) throw new Error(`HTTP ${failed.status}`)

      const jsons = await Promise.all(responses.map(r => r.json()))

      // Merge: if single leg, use as-is; otherwise combine legs arrays
      let data
      if (jsons.length === 1) {
        data = jsons[0]
      } else {
        // Multi-leg: merge legs arrays from each response
        data = {
          ...jsons[0],
          legs: jsons.flatMap((d, i) => d.legs ?? []),
        }
      }

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
  const handleRouteCommit = useCallback((legs) => {
    const urls = buildAllLegUrls(legs)
    setRouteLegs(legs)
    setRouteModified(false)
    runFetch(urls, { legs }, {
      transitionState: 'fetching',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('planning')
      },
    })
  }, [runFetch])

  // planning → refreshing → planning
  const handleRefresh = useCallback(() => {
    const urls = buildAllLegUrls(routeLegs)
    setRouteModified(false)
    runFetch(urls, { legs: routeLegs }, {
      transitionState: 'refreshing',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('planning')
      },
    })
  }, [runFetch, routeLegs])

  // planning → finalizing → acknowledging
  const handleFinalize = useCallback(() => {
    const urls = buildAllLegUrls(routeLegs)
    runFetch(urls, { legs: routeLegs }, {
      transitionState: 'finalizing',
      onSuccess: (data) => {
        setWeatherData(data)
        setAppState('acknowledging')
      },
    })
  }, [runFetch, routeLegs])

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

      {appState === 'route-entry' && (
        <RouteEntry
          routeState={routeState}
          onCommit={handleRouteCommit}
        />
      )}

      {(appState === 'fetching' || appState === 'refreshing') && (
        <FetchingMoment
          routeLegs={routeLegs}
          onBack={handleBackToRouteEntry}
        />
      )}

      {appState === 'finalizing' && (
        <LoadingMoment onBack={handleBackToRouteEntry} />
      )}

      {appState === 'error' && (
        <ErrorMoment
          error={apiError}
          onBack={handleBackToRouteEntry}
          onRetry={handleRetry}
        />
      )}

      {(appState === 'planning' || appState === 'refreshing') && weatherData && (
        <PlanningMoment
          weatherData={weatherData}
          routeLegs={routeLegs}
          routeModified={routeModified}
          onRefresh={handleRefresh}
          onFinalize={handleFinalize}
        />
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
