import React, { useState, useEffect, useRef } from 'react'

// Derive a flat list of jump targets from the steps array.
// Returns: [{ label, idx }, { label: 'Stations', stations: [{ id, role, roleLabel, idx }, ...] }, ...]
function buildContents(steps) {
  const sections = []

  const tripIdx = steps.findIndex(s => s.id === 'trip_overview')
  if (tripIdx >= 0) sections.push({ label: 'Trip Overview', idx: tripIdx })

  // Stations — one entry per unique section key (leg+role+station), in route order.
  // section format: 'station-{li}-{dep|arr}-{stationId}'
  const seenKeys = []
  steps.forEach((s, i) => {
    if (!s.section?.startsWith('station-')) return
    if (seenKeys.some(x => x.sectionKey === s.section)) return
    const parts     = s.section.split('-')
    const role      = parts[2]          // 'dep' or 'arr'
    const stationId = parts.slice(3).join('-')
    seenKeys.push({ sectionKey: s.section, id: stationId, role, idx: i })
  })

  if (seenKeys.length > 0) {
    // Count occurrences per station ID to know which need a role label
    const idCount = {}
    seenKeys.forEach(({ id }) => { idCount[id] = (idCount[id] || 0) + 1 })

    const stations = seenKeys.map(({ sectionKey, id, role, idx }) => ({
      sectionKey,
      id,
      roleLabel: idCount[id] > 1 ? (role === 'dep' ? 'departure' : 'arrival') : null,
      idx,
    }))
    sections.push({ label: 'Stations', stations })
  }

  const advIdx = steps.findIndex(s => s.section === 'advisories' || s.parentSection === 'advisories')
  if (advIdx >= 0) sections.push({ label: 'Advisories', idx: advIdx })

  const riIdx = steps.findIndex(s => s.parentSection === 'routeIntel')
  if (riIdx >= 0) sections.push({ label: 'Route Intelligence', idx: riIdx })

  const byfIdx = steps.findIndex(s => s.id === 'before_you_fly')
  if (byfIdx >= 0) sections.push({ label: 'Before You Fly', idx: byfIdx })

  return sections
}

export default function WalkthroughOverlay({ steps, initialStep, resolveRef, expandSection, onStepChange, onExit }) {
  const [stepIdx,       setStepIdx]       = useState(initialStep ?? 0)
  const [spotlightRect, setSpotlightRect] = useState(null)
  const [slidIn,        setSlidIn]        = useState(false)
  const [textOpacity,   setTextOpacity]   = useState(1)
  const [showContents,  setShowContents]  = useState(false)

  const touchStartX    = useRef(null)
  const touchStartY    = useRef(null)
  const scrollTimer    = useRef(null)
  const contentsListRef = useRef(null)

  // Always-current step ref — lets the scroll listener avoid stale closures
  const stepRef = useRef(null)

  const step        = steps[stepIdx] ?? steps[0]
  const panelHeight = Math.min(
    typeof window !== 'undefined' ? Math.round(window.innerHeight * 0.38) : 300,
    320
  )
  const progress = steps.length > 1 ? (stepIdx + 1) / steps.length : 1

  // Keep stepRef in sync on every render
  stepRef.current = step

  // ── Measure spotlight ────────────────────────────────────────────
  // The overlay and spotlight are both position:fixed — getBoundingClientRect()
  // returns viewport-relative coordinates, which is the correct coordinate space.
  // No window.scrollY adjustment is needed or correct here.
  function measureSpotlight() {
    const s  = stepRef.current
    const el = resolveRef?.(s?.section)
    if (!el) { setSpotlightRect(null); return }
    const r = el.getBoundingClientRect()
    setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
  }

  // ── Wait for scroll to settle, then run callback ─────────────────
  // Uses scrollend if available (fires when scrolling stops), with a 100ms
  // setTimeout fallback. A `settled` flag prevents double-firing when both paths
  // race to completion (e.g. the page was already at the target position).
  function afterScroll(callback) {
    clearTimeout(scrollTimer.current)
    let settled = false
    const settle = () => {
      if (settled) return
      settled = true
      callback()
    }
    if ('onscrollend' in window) {
      window.addEventListener('scrollend', settle, { once: true })
      scrollTimer.current = setTimeout(settle, 100)
    } else {
      scrollTimer.current = setTimeout(settle, 360)
    }
  }

  // ── Re-measure spotlight on manual scroll ────────────────────────
  // Attaches for the lifetime of the overlay so the spotlight tracks the page
  // as the pilot scrolls between navigating steps. Reads stepRef so the
  // callback always references the current step without needing to re-attach.
  useEffect(() => {
    let rafId = null
    const onScroll = () => {
      cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const s  = stepRef.current
        const el = resolveRef?.(s?.section)
        if (!el) { setSpotlightRect(null); return }
        const r = el.getBoundingClientRect()
        setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(rafId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Scroll to step, expanding its parent section first if needed ─
  function scrollToStep(s) {
    const hasParent = !!s?.parentSection

    // Expand the collapsible section before attempting to scroll/spotlight.
    // After expansion React needs one render pass to make the children visible,
    // so we wait 60ms before measuring the target element.
    if (hasParent) expandSection?.(s.parentSection)

    const doScroll = () => {
      const el = resolveRef?.(s?.section)
      if (!el) { setSpotlightRect(null); return }

      const rect      = el.getBoundingClientRect()
      const marginTop = 72                                    // gap from top of viewport
      const safeBottom = window.innerHeight - panelHeight - 24 // max allowed bottom edge
      const available  = safeBottom - marginTop

      // Station steps: pin the card top to marginTop so the station header
      // stays visible while walking through sub-steps (ceiling, wind, etc.).
      // Skip the safeBottom clamp — tall cards intentionally extend behind the
      // panel; the pilot sees the header and walks down via the walkthrough.
      if (s?.section?.startsWith('station-')) {
        const scrollTarget = Math.max(0, Math.round(window.scrollY + rect.top - marginTop))
        window.scrollTo({ top: scrollTarget, behavior: 'smooth' })
        // Spotlight the station card container explicitly using s.section (not the
        // step closure) so the measurement is always for this specific card.
        const stationSection = s.section
        afterScroll(() => {
          const cardEl = resolveRef?.(stationSection)
          if (cardEl) {
            const r = cardEl.getBoundingClientRect()
            setSpotlightRect({ top: r.top, left: r.left, width: r.width, height: r.height })
          } else {
            setSpotlightRect(null)
          }
        })
        return
      }

      // Other steps: center the element in the available space above the panel.
      let delta
      if (rect.height <= available) {
        const centerY = marginTop + available / 2
        delta = rect.top - centerY + rect.height / 2
      } else {
        delta = rect.top - marginTop
      }

      // Clamp: element's bottom must not go under the panel
      const bottomAfterScroll = rect.bottom - delta
      if (bottomAfterScroll > safeBottom) {
        delta += bottomAfterScroll - safeBottom
      }

      window.scrollTo({ top: Math.max(0, Math.round(window.scrollY + delta)), behavior: 'smooth' })
      afterScroll(measureSpotlight)
    }

    if (hasParent) {
      setTimeout(doScroll, 60)
    } else {
      doScroll()
    }
  }

  // Slide in on mount, then scroll to initial step
  useEffect(() => {
    requestAnimationFrame(() => setSlidIn(true))
    scrollToStep(step)
    return () => clearTimeout(scrollTimer.current)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Re-scroll whenever step changes (after mount)
  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    scrollToStep(step)
  }, [stepIdx]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Navigation ───────────────────────────────────────────────────
  function goTo(newIdx) {
    setShowContents(false)
    setTextOpacity(0)
    setTimeout(() => {
      setStepIdx(newIdx)
      onStepChange?.(newIdx)
      setTextOpacity(1)
    }, 150)
  }

  function goNext() {
    if (stepIdx >= steps.length - 1) { onExit(); return }
    goTo(stepIdx + 1)
  }

  function goBack() {
    if (stepIdx <= 0) return
    goTo(stepIdx - 1)
  }

  // ── Touch / swipe ────────────────────────────────────────────────
  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null

    // Swipe down → exit
    if (Math.abs(dy) > Math.abs(dx) && dy > 60) { onExit(); return }
    // Horizontal swipe ≥ 50px
    if (Math.abs(dx) < 50) return
    if (dx < 0) goNext()
    else        goBack()
  }

  // ── Spotlight geometry ───────────────────────────────────────────
  const PAD = 8 // padding around spotlight element

  const contents = buildContents(steps)

  // Active contents entry — highest entry idx that is ≤ stepIdx
  const allEntryIdxs = contents.flatMap(s => s.stations ? s.stations.map(st => st.idx) : [s.idx])
  const activeEntryIdx = allEntryIdxs.filter(i => i <= stepIdx).reduce((max, i) => Math.max(max, i), -1)

  // Ref callback for the contents list div.
  // Fires during commit each time the panel opens (the div mounts/unmounts with showContents).
  // Sets scrollTop = 0 synchronously before any paint, then scrolls the active
  // entry into view in the next frame once layout is complete.
  function contentsListRefCallback(el) {
    contentsListRef.current = el
    if (!el) return
    el.scrollTop = 0
  }

  // Extract station ID from section key 'station-{li}-{dep|arr}-{KXXX}' → 'KXXX'
  const stationSection = step?.section?.startsWith('station-') ? step.section : null
  const stationBadge   = stationSection ? stationSection.split('-').slice(3).join('-') : null

  return (
    <>
      {/* Dark overlay via box-shadow on spotlight hole.
          When we have a rect, the hole element's box-shadow creates the
          dark surround. Without a rect, we show a plain dark cover. */}
      {spotlightRect ? (
        <div
          aria-hidden="true"
          style={{
            position:      'fixed',
            zIndex:        9000,
            pointerEvents: 'none',
            top:           spotlightRect.top    - PAD,
            left:          spotlightRect.left   - PAD,
            width:         spotlightRect.width  + PAD * 2,
            height:        spotlightRect.height + PAD * 2,
            boxShadow:     '0 0 0 100vmax rgba(0,0,0,0.65)',
            borderRadius:  '8px',
            transition:    'top 0.3s ease-out, left 0.3s ease-out, width 0.3s ease-out, height 0.3s ease-out',
          }}
        />
      ) : (
        <div
          aria-hidden="true"
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 9000, pointerEvents: 'none' }}
        />
      )}

      {/* Bottom panel */}
      <div
        role="dialog"
        aria-label="Walkthrough"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        style={{
          position:      'fixed',
          bottom:        0,
          left:          0,
          right:         0,
          height:        `${panelHeight}px`,
          background:    'var(--color-surface)',
          borderTop:     '1px solid var(--color-border)',
          borderRadius:  '16px 16px 0 0',
          zIndex:        9001,
          transform:     `translateY(${slidIn ? '0%' : '100%'})`,
          transition:    'transform 0.3s ease-out',
          display:       'flex',
          flexDirection: 'column',
          overflow:      'hidden',
          boxShadow:     '0 -4px 24px rgba(0,0,0,0.3)',
        }}
      >
        {/* Progress bar — very top edge of panel */}
        <div style={{ height: '3px', background: 'var(--color-border)', flexShrink: 0 }}>
          <div style={{
            height:     '100%',
            width:      `${progress * 100}%`,
            background: 'var(--color-brand-gold)',
            transition: 'width 0.3s ease-out',
          }} />
        </div>

        {/* Header row: step count | station badge | Contents button | Exit button */}
        <div style={{
          display:    'flex',
          alignItems: 'center',
          padding:    '6px 20px 2px',
          flexShrink: 0,
          minHeight:  '44px',
        }}>
          <span
            className="text-small"
            style={{ flex: 1, color: 'var(--color-text-muted)' }}
          >
            {stepIdx + 1} / {steps.length}
          </span>
          {stationBadge && (
            <span style={{
              fontFamily:      'var(--font-mono, "IBM Plex Mono", monospace)',
              fontSize:        'var(--text-label)',
              color:           'var(--color-text-primary)',
              backgroundColor: 'var(--color-surface-2)',
              border:          '1px solid var(--color-border)',
              borderRadius:    '6px',
              padding:         '1px 7px',
              marginRight:     '10px',
              letterSpacing:   '0.03em',
            }}>
              {stationBadge}
            </span>
          )}
          <button
            onClick={() => setShowContents(v => !v)}
            style={{
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              fontFamily:  'var(--font-sans)',
              fontSize:    'var(--text-label)',
              color:       showContents ? 'var(--color-brand-gold)' : 'var(--color-text-muted)',
              padding:     '0',
              minHeight:   '44px',
              minWidth:    '44px',
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'center',
              marginRight: '12px',
            }}
            onMouseEnter={e => { if (!showContents) e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { if (!showContents) e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            Contents
          </button>
          <button
            onClick={onExit}
            style={{
              background:  'none',
              border:      'none',
              cursor:      'pointer',
              fontFamily:  'var(--font-sans)',
              fontSize:    'var(--text-label)',
              color:       'var(--color-text-muted)',
              padding:     '0',
              minHeight:   '44px',
              minWidth:    '44px',
              display:     'flex',
              alignItems:  'center',
              justifyContent: 'flex-end',
              gap:         '4px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
          >
            <span aria-hidden="true" style={{ fontSize: '1rem', lineHeight: 1 }}>×</span>
            Exit
          </button>
        </div>

        {/* Contents panel — replaces step text when open */}
        {showContents ? (
          <div ref={contentsListRefCallback} style={{
            flex:      1,
            overflowY: 'auto',
            padding:   '4px 20px 8px',
          }}>
            {contents.map((section, si) => {
              if (section.stations) {
                return (
                  <div key={si}>
                    <div style={{
                      fontSize:       'var(--text-label)',
                      color:          'var(--color-text-muted)',
                      textTransform:  'uppercase',
                      letterSpacing:  '0.05em',
                      padding:        '6px 0 2px',
                    }}>
                      Stations
                    </div>
                    {section.stations.map(({ sectionKey, id, idx }) => (
                      <button
                        key={sectionKey}
                        data-active={idx === activeEntryIdx ? 'true' : 'false'}
                        onClick={() => goTo(idx)}
                        style={{
                          display:      'flex',
                          alignItems:   'baseline',
                          gap:          '7px',
                          width:        '100%',
                          textAlign:    'left',
                          background:   'none',
                          border:       'none',
                          cursor:       'pointer',
                          fontFamily:   'var(--font-mono, monospace)',
                          fontSize:     'var(--text-body)',
                          color:        'var(--color-text-primary)',
                          padding:      '7px 0 7px 12px',
                          borderBottom: '1px solid var(--color-border)',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-brand-gold)' }}
                        onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
                      >
                        {id}
                      </button>
                    ))}
                  </div>
                )
              }
              return (
                <button
                  key={si}
                  data-active={section.idx === activeEntryIdx ? 'true' : 'false'}
                  onClick={() => goTo(section.idx)}
                  style={{
                    display:      'block',
                    width:        '100%',
                    textAlign:    'left',
                    background:   'none',
                    border:       'none',
                    cursor:       'pointer',
                    fontFamily:   'var(--font-sans)',
                    fontSize:     'var(--text-body)',
                    color:        'var(--color-text-primary)',
                    padding:      '7px 0',
                    borderBottom: '1px solid var(--color-border)',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-brand-gold)' }}
                  onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
                >
                  {section.label}
                </button>
              )
            })}
          </div>
        ) : (
          /* Scrollable step content */
          <div style={{
            flex:       1,
            overflowY:  'auto',
            padding:    '4px 20px 8px',
            opacity:    textOpacity,
            transition: 'opacity 0.15s ease',
          }}>
            {/* Step title */}
            <span
              className="text-small"
              style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}
            >
              {step?.title}
            </span>

            {/* Content: list for "before you fly" steps, paragraph otherwise */}
            {step?.items ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {step.items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <span style={{
                      flexShrink:  0,
                      lineHeight:  1.6,
                      fontSize:    '0.7rem',
                      color:       'var(--color-brand-gold)',
                      marginTop:   '1px',
                      userSelect:  'none',
                    }}>●</span>
                    <p className="text-small" style={{ margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.65 }}>
                      {item}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-body" style={{ margin: 0, color: 'var(--color-text-primary)', lineHeight: 1.65 }}>
                {step?.text}
              </p>
            )}
          </div>
        )}

        {/* Navigation: Back | Next/Finish */}
        <div style={{ flexShrink: 0, padding: '4px 20px 20px', borderTop: '1px solid var(--color-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
              onClick={goBack}
              disabled={stepIdx === 0}
              style={{
                background:  'none',
                border:      'none',
                cursor:      stepIdx === 0 ? 'default' : 'pointer',
                fontFamily:  'var(--font-sans)',
                fontSize:    'var(--text-label)',
                color:       stepIdx === 0 ? 'var(--color-border)' : 'var(--color-text-muted)',
                padding:     '0',
                minHeight:   '44px',
                flexShrink:  0,
                transition:  'color 0.1s',
              }}
            >
              ← Back
            </button>

            <button
              onClick={goNext}
              style={{
                background:  'none',
                border:      'none',
                cursor:      'pointer',
                fontFamily:  'var(--font-sans)',
                fontSize:    'var(--text-label)',
                fontWeight:  600,
                color:       'var(--color-brand-gold)',
                padding:     '0',
                minHeight:   '44px',
                flexShrink:  0,
              }}
            >
              {stepIdx >= steps.length - 1 ? 'Finish' : 'Next →'}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
