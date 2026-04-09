import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import WalkthroughOverlay from './WalkthroughOverlay'
import { buildSteps, gairmetProductKey } from '../utils/buildSteps'

// ── Verdict helpers ──────────────────────────────────────────────

function recKey(rec) {
  if (!rec) return 'WITHIN'
  const u = rec.toUpperCase().replace(/_/g, ' ')
  if (u.includes('NOT LEGAL')) return 'NOT_LEGAL'
  if (u.includes('BELOW'))     return 'BELOW'
  if (u.includes('MARGINAL'))  return 'MARGINAL'
  return 'WITHIN'
}

const REC_ORDER = { NOT_LEGAL: 4, BELOW: 3, MARGINAL: 2, WITHIN: 1 }

function verdictColor(rec) {
  const k = recKey(rec)
  if (k === 'NOT_LEGAL' || k === 'BELOW') return 'var(--color-below)'
  if (k === 'MARGINAL')                   return 'var(--color-marginal)'
  return 'var(--color-within)'
}

function verdictLabel(rec) {
  const k = recKey(rec)
  if (k === 'NOT_LEGAL') return 'Not Legal'
  if (k === 'BELOW')     return 'Below Minimums'
  if (k === 'MARGINAL')  return 'Marginal'
  return 'Within Minimums'
}

function worstRec(data) {
  let best = 'WITHIN'
  let bestOrder = 1
  for (const leg of data?.legs ?? []) {
    for (const report of leg.reports ?? []) {
      const k = recKey(report.recommendation)
      const o = REC_ORDER[k] ?? 1
      if (o > bestOrder) { bestOrder = o; best = k }
    }
    // Convective SIGMET on route → at least BELOW regardless of station weather
    if ((leg.routeIntelligence?.convectiveSigmets ?? []).length > 0) {
      if (REC_ORDER['BELOW'] > bestOrder) { bestOrder = REC_ORDER['BELOW']; best = 'BELOW' }
    }
  }
  if (best === 'NOT_LEGAL') return 'NOT_LEGAL'
  if (best === 'BELOW')     return 'BELOW'
  if (best === 'MARGINAL')  return 'MARGINAL'
  return 'WITHIN'
}

function fcColor(fc) {
  if (!fc) return 'var(--color-text-muted)'
  const u = fc.toUpperCase()
  if (u === 'LIFR') return 'var(--color-hazard)'
  if (u === 'IFR')  return 'var(--color-below)'
  if (u === 'MVFR') return 'var(--color-marginal)'
  return 'var(--color-within)'
}

function dedup(arr, keyFn) {
  const seen = new Set()
  return arr.filter(item => {
    const k = keyFn(item)
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

function stripEmoji(s) {
  if (!s) return ''
  return s.replace(/^[\p{Emoji_Presentation}\p{Extended_Pictographic}\s]+/u, '').trim()
}

function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${m}/${d}/${y}`
}

function fmtUtc(str) {
  if (!str) return ''
  try {
    const d = new Date(str)
    return d.toUTCString().replace(/, /,' ').replace(' GMT', 'Z')
  } catch { return str }
}

// ── CollapsibleSection ───────────────────────────────────────────

function CollapsibleSection({ title, badge, badgeColor, defaultOpen = false, open: openProp, onToggle, headerRef, children }) {
  const [openState, setOpenState] = useState(defaultOpen)
  const isControlled = openProp !== undefined
  const open   = isControlled ? openProp : openState
  const toggle = () => isControlled ? onToggle?.(!open) : setOpenState(v => !v)
  return (
    <div style={{ borderTop: '1px solid var(--color-border)' }}>
      <button
        ref={headerRef}
        onClick={toggle}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '14px 0',
          background:     'none',
          border:         'none',
          cursor:         'pointer',
          fontFamily:     'var(--font-sans)',
          minHeight:      '44px',
        }}
      >
        <span className="text-label font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          {title}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {badge != null && (
            <span style={{
              fontSize:        '0.65rem',
              fontWeight:      600,
              padding:         '2px 7px',
              borderRadius:    '10px',
              backgroundColor: badgeColor ?? 'var(--color-border)',
              color:           badgeColor ? '#0D1120' : 'var(--color-text-secondary)',
            }}>
              {badge}
            </span>
          )}
          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>
            {open ? '▲' : '▼'}
          </span>
        </div>
      </button>
      {open && <div>{children}</div>}
    </div>
  )
}

// ── Badges ───────────────────────────────────────────────────────

function VerdictBadge({ recommendation }) {
  const color = verdictColor(recommendation)
  const label = verdictLabel(recommendation)
  const bold  = recKey(recommendation) === 'NOT_LEGAL'
  return (
    <span style={{
      display:       'inline-flex',
      alignItems:    'center',
      padding:       '2px 8px',
      borderRadius:  '4px',
      border:        `1px solid ${color}`,
      color,
      fontSize:      '0.68rem',
      fontWeight:    bold ? 700 : 500,
      fontFamily:    'var(--font-sans)',
      letterSpacing: '0.02em',
      flexShrink:    0,
    }}>
      {label}
    </span>
  )
}

function FcBadge({ category }) {
  if (!category) return null
  const color = fcColor(category)
  return (
    <span style={{
      display:         'inline-flex',
      alignItems:      'center',
      padding:         '2px 7px',
      borderRadius:    '4px',
      backgroundColor: color,
      color:           '#0D1120',
      fontSize:        '0.65rem',
      fontWeight:      700,
      fontFamily:      'var(--font-mono)',
      letterSpacing:   '0.05em',
      flexShrink:      0,
    }}>
      {category.toUpperCase()}
    </span>
  )
}

// ── StationCard (Layer 2) ────────────────────────────────────────

function DataRow({ label, value, mono = true }) {
  if (value == null || value === '') return null
  return (
    <div>
      <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>{label}</span>
      <span className={mono ? 'font-mono text-label' : 'text-label'} style={{ color: 'var(--color-text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

function StationCard({ report }) {
  const [tafOpen,   setTafOpen]   = useState(false)
  const [metarOpen, setMetarOpen] = useState(false)
  const [posOpen,   setPosOpen]   = useState(false)

  const analysis = report.departureAnalysis || report.arrivalAnalysis || {}
  const da       = analysis.densityAltitude  || {}
  const concerns = analysis.concerns  || []
  const positives= analysis.positives || []

  const collapseBtn = {
    background:  'none',
    border:      'none',
    cursor:      'pointer',
    padding:     '6px 0',
    fontFamily:  'var(--font-sans)',
    fontSize:    'var(--text-small)',
    color:       'var(--color-text-muted)',
    display:     'flex',
    alignItems:  'center',
    gap:         '4px',
    minHeight:   '44px',
  }

  const rawBlock = {
    margin:          0,
    padding:         '10px 12px',
    backgroundColor: 'var(--color-base)',
    border:          '1px solid var(--color-border)',
    borderRadius:    '6px',
    fontSize:        '0.63rem',
    fontFamily:      'var(--font-mono)',
    color:           'var(--color-text-secondary)',
    whiteSpace:      'pre-wrap',
    wordBreak:       'break-all',
    lineHeight:      1.55,
  }

  return (
    <div style={{
      backgroundColor: 'var(--color-surface-2)',
      border:          '1px solid var(--color-border)',
      borderRadius:    '10px',
      overflow:        'hidden',
    }}>
      {/* Header */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        padding:        '12px 14px',
        borderBottom:   '1px solid var(--color-border)',
        flexWrap:       'wrap',
        gap:            '8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', flexWrap: 'wrap' }}>
          <span className="font-mono" style={{ fontSize: 'var(--text-title)', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {report.station}
          </span>
          {report.stationName && (
            <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
              {report.stationName}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <FcBadge category={analysis.flightCategory} />
          {report.recommendation && <VerdictBadge recommendation={report.recommendation} />}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px' }}>

        {/* Wind + crosswind */}
        {(analysis.windSpeed != null || analysis.crosswind != null) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            {analysis.windSpeed != null && (
              <DataRow
                label="Wind"
                value={`${analysis.windSpeed} kt${analysis.gustSpeed ? ` G${analysis.gustSpeed}` : ''}`}
              />
            )}
            {analysis.crosswind != null && (
              <DataRow label="Crosswind" value={`${analysis.crosswind} kt`} />
            )}
          </div>
        )}

        {/* Vis + ceiling */}
        {(analysis.visibility != null || analysis.ceilingLabel) && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px 24px' }}>
            {analysis.visibility != null && (
              <DataRow label="Visibility" value={`${analysis.visibility} SM`} />
            )}
            {analysis.ceilingLabel && (
              <DataRow label="Ceiling" value={analysis.ceilingLabel} />
            )}
          </div>
        )}

        {/* Night / day */}
        {analysis.isNight != null && (
          <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
            {analysis.isNight ? 'Night conditions' : 'Day conditions'}
          </span>
        )}

        {/* Density altitude */}
        {(da.densityAlt != null || da.pressureAlt != null) && (
          <div>
            <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '4px' }}>
              Density altitude
            </span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px' }}>
              {da.densityAlt != null && (
                <span className="font-mono text-small" style={{ color: 'var(--color-text-primary)' }}>
                  DA {da.densityAlt.toLocaleString()} ft
                </span>
              )}
              {da.pressureAlt != null && (
                <span className="font-mono text-small" style={{ color: 'var(--color-text-secondary)' }}>
                  PA {da.pressureAlt.toLocaleString()} ft
                </span>
              )}
              {(da.elevationFt ?? da.elevation) != null && (
                <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
                  Elev {(da.elevationFt ?? da.elevation).toLocaleString()} ft
                </span>
              )}
            </div>
          </div>
        )}

        {/* Concerns */}
        {concerns.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {concerns.map((c, i) => (
              <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                <span style={{ color: 'var(--color-marginal)', flexShrink: 0, lineHeight: 1.5 }}>●</span>
                <span className="text-small" style={{ color: 'var(--color-marginal)', lineHeight: 1.5 }}>
                  {stripEmoji(c)}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Positives — collapsible */}
        {positives.length > 0 && (
          <div>
            <button onClick={() => setPosOpen(v => !v)} style={collapseBtn}>
              {posOpen ? '▲' : '▼'}&nbsp;{positives.length} positive{positives.length !== 1 ? 's' : ''}
            </button>
            {posOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', paddingTop: '2px' }}>
                {positives.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ color: 'var(--color-within)', flexShrink: 0, lineHeight: 1.5 }}>●</span>
                    <span className="text-small" style={{ color: 'var(--color-within)', lineHeight: 1.5 }}>
                      {stripEmoji(p)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAF — collapsible */}
        {report.hasTaf && report.taf && (
          <div>
            <button onClick={() => setTafOpen(v => !v)} style={collapseBtn}>
              {tafOpen ? '▲' : '▼'}&nbsp;TAF
            </button>
            {tafOpen && <pre style={rawBlock}>{report.taf}</pre>}
          </div>
        )}

        {/* METAR — collapsible */}
        {report.metarRaw && (
          <div>
            <button onClick={() => setMetarOpen(v => !v)} style={collapseBtn}>
              {metarOpen ? '▲' : '▼'}&nbsp;METAR
            </button>
            {metarOpen && <pre style={rawBlock}>{report.metarRaw}</pre>}
          </div>
        )}

      </div>
    </div>
  )
}

// ── Layer 3 — Advisories ─────────────────────────────────────────

function GairmetItem({ item }) {
  const product = (item.product || item.hazard || '').toUpperCase()
  return (
    <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-base)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        {product && (
          <span style={{ fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', backgroundColor: 'var(--color-marginal)', color: '#0D1120' }}>
            {product}
          </span>
        )}
        {item.hazard && item.hazard.toUpperCase() !== product && (
          <span className="text-small font-medium" style={{ color: 'var(--color-text-primary)' }}>{item.hazard}</span>
        )}
      </div>
      {item.dueTo && <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>Due to: {item.dueTo}</span>}
      {(item.base || item.top) && (
        <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
          {item.base ? `Base: ${item.base}` : ''}{item.base && item.top ? '  ' : ''}{item.top ? `Top: ${item.top}` : ''}
        </span>
      )}
      {(item.validFrom || item.validTo) && (
        <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
          {item.validFrom ? fmtUtc(item.validFrom) : ''}{item.validFrom && item.validTo ? ' → ' : ''}{item.validTo ? fmtUtc(item.validTo) : ''}
        </span>
      )}
    </div>
  )
}

function SigmetItem({ item, isConvective }) {
  const color = isConvective ? 'var(--color-hazard)' : 'var(--color-below)'
  return (
    <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-base)', borderRadius: '6px', border: `1px solid ${color}`, display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <span className="text-label font-medium" style={{ color }}>
        {isConvective ? 'Convective SIGMET' : 'SIGMET'}{item.id ? ` ${item.id}` : ''}
      </span>
      {item.rawText && (
        <pre style={{ margin: 0, fontSize: '0.63rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {item.rawText}
        </pre>
      )}
      {(item.validFrom || item.validTo) && (
        <span className="text-small" style={{ color: 'var(--color-text-muted)' }}>
          {item.validFrom ? fmtUtc(item.validFrom) : ''}{item.validFrom && item.validTo ? ' → ' : ''}{item.validTo ? fmtUtc(item.validTo) : ''}
        </span>
      )}
    </div>
  )
}

function PirepItem({ item }) {
  return (
    <div style={{ padding: '10px 12px', backgroundColor: 'var(--color-base)', borderRadius: '6px', border: '1px solid var(--color-border)', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {item.aircraftType && <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>{item.aircraftType}</span>}
        {item.altitude != null && <span className="font-mono text-small" style={{ color: 'var(--color-text-secondary)' }}>{item.altitude} ft</span>}
      </div>
      {item.rawText && (
        <pre style={{ margin: 0, fontSize: '0.63rem', fontFamily: 'var(--font-mono)', color: 'var(--color-text-secondary)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.5 }}>
          {item.rawText}
        </pre>
      )}
    </div>
  )
}

function AdvisoriesSection({ legs, open, onToggle, innerRefs, headerRef }) {
  const gairmets = dedup(
    legs.flatMap(l => l.routeIntelligence?.gairmets ?? []),
    g => `${g.hazard}|${g.validFrom}|${g.validTo}|${g.product}`
  )
  const sigmets = dedup(
    legs.flatMap(l => l.routeIntelligence?.sigmets ?? []),
    s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`
  )
  const convectiveSigmets = dedup(
    legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []),
    s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`
  )
  const pireps = dedup(
    legs.flatMap(l => l.routeIntelligence?.pireps ?? []),
    p => p.rawText ?? JSON.stringify(p)
  )
  const [pireOpen, setPireOpen] = useState(false)

  const sigCount   = gairmets.length + sigmets.length + convectiveSigmets.length
  const totalCount = sigCount + pireps.length
  if (totalCount === 0) return null

  const hasConvective = convectiveSigmets.length > 0
  const badgeColor    = hasConvective ? 'var(--color-hazard)'
                      : sigmets.length > 0 ? 'var(--color-below)'
                      : 'var(--color-marginal)'

  // Group G-AIRMETs by product key so each group can be spotlighted individually
  const gairmetGroups = {}
  for (const g of gairmets) {
    const gKey = gairmetProductKey(g)
    if (!gairmetGroups[gKey]) gairmetGroups[gKey] = []
    gairmetGroups[gKey].push(g)
  }

  return (
    <CollapsibleSection
      title="Advisories"
      badge={sigCount > 0 ? sigCount : undefined}
      badgeColor={sigCount > 0 ? badgeColor : undefined}
      open={open}
      onToggle={onToggle}
      headerRef={headerRef}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', paddingBottom: '16px' }}>

        {gairmets.length > 0 && (
          <div>
            <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>G-AIRMETs</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {Object.entries(gairmetGroups).map(([gKey, items]) => (
                <div key={gKey} ref={el => { if (innerRefs) innerRefs.current[`gairmet-${gKey}`] = el }}>
                  {items.map((g, i) => <GairmetItem key={i} item={g} />)}
                </div>
              ))}
            </div>
          </div>
        )}

        {sigmets.length > 0 && (
          <div ref={el => { if (innerRefs) innerRefs.current['sigmets'] = el }}>
            <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>SIGMETs</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {sigmets.map((s, i) => <SigmetItem key={i} item={s} isConvective={false} />)}
            </div>
          </div>
        )}

        {hasConvective && (
          <div ref={el => { if (innerRefs) innerRefs.current['convective-sigmets'] = el }}>
            <span className="text-small font-medium" style={{ color: 'var(--color-hazard)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>CONVECTIVE SIGMETs</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {convectiveSigmets.map((s, i) => <SigmetItem key={i} item={s} isConvective={true} />)}
            </div>
          </div>
        )}

        {pireps.length > 0 && (
          <div ref={el => { if (innerRefs) innerRefs.current['pireps'] = el }}>
            <button
              onClick={() => setPireOpen(v => !v)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-sans)',
                padding: '8px 0', minHeight: '44px',
              }}
            >
              <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>PIREPs</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.65rem', fontWeight: 600, padding: '2px 7px', borderRadius: '10px', backgroundColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                  {pireps.length}
                </span>
                <span style={{ color: 'var(--color-text-muted)', fontSize: '0.7rem' }}>{pireOpen ? '▲' : '▼'}</span>
              </div>
            </button>
            {pireOpen && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {pireps.map((p, i) => <PirepItem key={i} item={p} />)}
              </div>
            )}
          </div>
        )}

      </div>
    </CollapsibleSection>
  )
}

// ── Layer 4 — Route Intelligence ─────────────────────────────────

function RouteIntelSection({ legs, cruiseAlt, open, onToggle, innerRefs }) {
  const allIntel  = legs.map(l => l.routeIntelligence).filter(Boolean)
  if (allIntel.length === 0) return null

  const first     = allIntel[0]
  const allTerrain= dedup(
    allIntel.flatMap(ri => ri.terrain ?? []),
    t => typeof t === 'string' ? t : (t.note ?? t.warning ?? JSON.stringify(t))
  )
  const allSfras  = dedup(
    allIntel.flatMap(ri => ri.sfras ?? []),
    s => s.id ?? s.name ?? JSON.stringify(s)
  )
  const ifrAlt    = allIntel.find(ri => ri.ifrAlternateRequired != null)?.ifrAlternateRequired
  const conusWarn = allIntel.find(ri => ri.conusWarning)?.conusWarning
  const routeNm   = allIntel.find(ri => ri.routeNm   != null)?.routeNm

  const itemStyle = {
    padding:         '10px 12px',
    backgroundColor: 'var(--color-base)',
    border:          '1px solid var(--color-border)',
    borderRadius:    '6px',
    display:         'flex',
    flexDirection:   'column',
    gap:             '4px',
  }

  const subHead = { color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }

  return (
    <CollapsibleSection title="Route Intelligence" open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '16px' }}>

        {/* Route distance */}
        {routeNm != null && (
          <div>
            <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '3px' }}>Route distance</span>
            <span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{routeNm} nm</span>
          </div>
        )}

        {/* Winds aloft — one block per leg */}
        {legs.map((leg, li) => {
          const wa = leg.routeIntelligence?.windsAloft
          if (!wa) return null
          const cw = wa.cruiseWind        || {}
          const hw = wa.headwindComponent || {}
          return (
            <div key={li} ref={el => { if (innerRefs) innerRefs.current[`winds-leg-${li}`] = el }}>
              <span className="text-small font-medium" style={{ ...subHead }}>
                WINDS ALOFT{legs.length > 1 ? ` — LEG ${li + 1}` : ''}
              </span>
              <div style={{ ...itemStyle, flexDirection: 'row', flexWrap: 'wrap', gap: '12px 20px' }}>
                {wa.station && <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Station</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{wa.station}</span></div>}
                {(cw.direction != null || cw.speed != null) && (
                  <div>
                    <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>
                      Cruise wind{cw.altitude != null ? ` @ ${cw.altitude.toLocaleString()} ft` : ''}
                    </span>
                    <span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>
                      {cw.direction != null ? `${String(cw.direction).padStart(3,'0')}°` : ''}
                      {cw.direction != null && cw.speed != null ? ' / ' : ''}
                      {cw.speed != null ? `${cw.speed} kt` : ''}
                    </span>
                  </div>
                )}
                {hw.component != null && (
                  <div>
                    <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>
                      {hw.isHeadwind ? 'Headwind' : hw.isTailwind ? 'Tailwind' : 'Wind component'}
                    </span>
                    <span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{Math.abs(hw.component)} kt</span>
                  </div>
                )}
                {wa.freezingLevel && (
                  <div ref={el => { if (innerRefs) innerRefs.current[`freezing-level-${li}`] = el }}>
                    <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Freezing level</span>
                    <span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{wa.freezingLevel}</span>
                  </div>
                )}
                {wa.validTime && (
                  <div>
                    <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Valid</span>
                    <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>{wa.validTime}</span>
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {/* Hemispheric rule */}
        {first?.hemispheric && (
          <div ref={el => { if (innerRefs) innerRefs.current['hemispheric'] = el }}>
            <span className="text-small font-medium" style={{ ...subHead }}>HEMISPHERIC RULE (FAR 91.159)</span>
            <div style={itemStyle}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span style={{
                  fontSize: '0.63rem', fontWeight: 700, padding: '2px 7px', borderRadius: '3px',
                  backgroundColor: first.hemispheric.pass ? 'var(--color-within)' : 'var(--color-marginal)',
                  color: '#0D1120',
                }}>
                  {first.hemispheric.pass ? 'PASS' : 'CHECK'}
                </span>
                {first.hemispheric.direction && (
                  <span className="text-label" style={{ color: 'var(--color-text-secondary)', textTransform: 'capitalize' }}>
                    {first.hemispheric.direction}
                  </span>
                )}
                {first.hemispheric.course != null && (
                  <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
                    {first.hemispheric.course}°
                  </span>
                )}
              </div>
              {cruiseAlt != null && (
                <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
                  {Number(cruiseAlt).toLocaleString()} ft
                </span>
              )}
            </div>
          </div>
        )}

        {/* SFRAs */}
        {allSfras.length > 0 && (
          <div>
            <span className="text-small font-medium" style={{ ...subHead }}>SPECIAL USE AIRSPACE</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allSfras.map((sfra, i) => {
                const sfraId = (sfra.name ?? sfra.id ?? '').replace(/\W+/g, '_')
                return (
                  <div key={i} ref={el => { if (innerRefs) innerRefs.current[`sfra-${sfraId}`] = el }} style={itemStyle}>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                      <span className="text-label font-medium" style={{ color: 'var(--color-text-primary)' }}>
                        {sfra.name || 'SFRA'}
                      </span>
                      {sfra.inside && (
                        <span style={{ fontSize: '0.63rem', fontWeight: 700, padding: '1px 6px', borderRadius: '3px', backgroundColor: 'var(--color-marginal)', color: '#0D1120' }}>INSIDE</span>
                      )}
                      {sfra.distNm != null && !sfra.inside && (
                        <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>{sfra.distNm} nm</span>
                      )}
                    </div>
                    {sfra.note && <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>{sfra.note}</span>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Terrain — red (hazard callout, not a verdict) */}
        {allTerrain.length > 0 && (
          <div ref={el => { if (innerRefs) innerRefs.current['terrain'] = el }}>
            <span className="text-small font-medium" style={{ color: 'var(--color-hazard)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>TERRAIN</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {allTerrain.map((t, i) => (
                <div key={i} style={{ ...itemStyle, border: '1px solid var(--color-hazard)' }}>
                  <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
                    {typeof t === 'string' ? t : (t.note ?? t.warning ?? JSON.stringify(t))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* IFR alternate */}
        {ifrAlt != null && (
          <div ref={el => { if (innerRefs) innerRefs.current['ifr-alternate'] = el }} style={itemStyle}>
            <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', letterSpacing: '0.05em' }}>IFR ALTERNATE (FAR 91.169)</span>
            <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
              {typeof ifrAlt === 'string' ? ifrAlt : ifrAlt ? 'Alternate required' : 'Alternate not required'}
            </span>
          </div>
        )}

        {/* CONUS warning */}
        {conusWarn && (
          <div ref={el => { if (innerRefs) innerRefs.current['conus'] = el }} style={{ ...itemStyle, border: '1px solid var(--color-marginal)' }}>
            <span className="text-small font-medium" style={{ color: 'var(--color-marginal)' }}>GEOGRAPHIC LIMITATION</span>
            <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>
              {typeof conusWarn === 'string' ? conusWarn : 'Route exits CONUS — route intelligence may be degraded.'}
            </span>
          </div>
        )}

      </div>
    </CollapsibleSection>
  )
}

// ── Layer 5 — Pilot Readiness ────────────────────────────────────

const IMSAFE_ITEMS = [
  { key: 'illness',    letter: 'I', label: 'Illness' },
  { key: 'medication', letter: 'M', label: 'Medication' },
  { key: 'stress',     letter: 'S', label: 'Stress' },
  { key: 'alcohol',    letter: 'A', label: 'Alcohol' },
  { key: 'fatigue',    letter: 'F', label: 'Fatigue' },
  { key: 'emotion',    letter: 'E', label: 'Emotion' },
]

function PilotReadinessLayer({ readiness, open, onToggle }) {
  if (!readiness) return null

  const { imsafe = {}, imsafeNotes = {}, currency = {} } = readiness

  const anyImsafe   = Object.values(imsafe).some(v => v !== null && v !== undefined)
  const anyCurrency = Object.values(currency).some(v => v !== '' && v != null)

  if (!anyImsafe && !anyCurrency) {
    return (
      <CollapsibleSection title="Pilot Readiness" open={open} onToggle={onToggle}>
        <p className="text-small" style={{ color: 'var(--color-text-muted)', paddingBottom: '16px', margin: 0 }}>
          No pilot readiness data entered.
        </p>
      </CollapsibleSection>
    )
  }

  const yesCount  = Object.values(imsafe).filter(v => v === true).length
  const badge     = yesCount > 0 ? `${yesCount} concern${yesCount > 1 ? 's' : ''}` : null
  const badgeColor= yesCount > 0 ? 'var(--color-marginal)' : undefined

  return (
    <CollapsibleSection title="Pilot Readiness" badge={badge} badgeColor={badgeColor} open={open} onToggle={onToggle}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', paddingBottom: '16px' }}>

        {anyImsafe && (
          <div>
            <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>IMSAFE</span>

            {/* Yes answers — concern item style (amber dot) */}
            {IMSAFE_ITEMS.some(({ key }) => imsafe[key] === true) && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '10px' }}>
                {IMSAFE_ITEMS.filter(({ key }) => imsafe[key] === true).map(({ key, label }) => {
                  const note = imsafeNotes[key]
                  const text = note ? `${label} flagged — ${note}` : `${label} flagged`
                  return (
                    <div key={key} style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                      <span style={{ color: 'var(--color-marginal)', flexShrink: 0, lineHeight: 1.5 }}>●</span>
                      <span className="text-small" style={{ color: 'var(--color-marginal)', lineHeight: 1.5 }}>{text}</span>
                    </div>
                  )
                })}
              </div>
            )}

            {/* No answers — label + green No */}
            {IMSAFE_ITEMS.some(({ key }) => imsafe[key] === false) && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {IMSAFE_ITEMS.filter(({ key }) => imsafe[key] === false).map(({ key, letter, label }) => (
                  <div key={key} style={{
                    display:     'flex',
                    gap:         '10px',
                    padding:     '8px 0 8px 8px',
                    borderBottom:'1px solid var(--color-border)',
                    borderLeft:  '3px solid transparent',
                  }}>
                    <span className="font-mono" style={{ fontSize: '0.65rem', color: 'var(--color-text-muted)', flexShrink: 0, marginTop: '2px' }}>
                      {letter}
                    </span>
                    <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                      <span className="text-small" style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                      <span className="text-small font-medium" style={{ color: 'var(--color-within)', flexShrink: 0 }}>No</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {anyCurrency && (
          <div>
            <span className="text-small font-medium" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.05em' }}>CURRENCY</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px 24px' }}>
              {currency.flightReviewDate && (
                <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Flight review</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{fmtDate(currency.flightReviewDate)}</span></div>
              )}
              {currency.dayLandings !== '' && currency.dayLandings != null && (
                <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Day landings</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{currency.dayLandings}</span></div>
              )}
              {currency.nightLandings !== '' && currency.nightLandings != null && (
                <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Night landings</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{currency.nightLandings}</span></div>
              )}
              {currency.iapCount !== '' && currency.iapCount != null && (
                <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Approaches</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{currency.iapCount}</span></div>
              )}
              {currency.holdsCount !== '' && currency.holdsCount != null && (
                <div><span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block' }}>Holds</span><span className="font-mono text-label" style={{ color: 'var(--color-text-primary)' }}>{currency.holdsCount}</span></div>
              )}
            </div>
          </div>
        )}

      </div>
    </CollapsibleSection>
  )
}

// ── Section navigation panel ─────────────────────────────────────
// items: [{ label, badge?, badgeColor?, onClick }]

function SectionNavPanel({ items, onClose }) {
  useEffect(() => {
    function onKey(e) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  return createPortal(
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 9000, backgroundColor: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position:        'fixed',
          bottom:          0,
          left:            0,
          right:           0,
          backgroundColor: 'var(--color-surface)',
          borderTop:       '1px solid var(--color-border)',
          borderRadius:    '16px 16px 0 0',
          maxHeight:       '60dvh',
          overflowY:       'auto',
          boxShadow:       '0 -4px 24px rgba(0,0,0,0.3)',
          padding:         '0 20px 32px',
        }}
      >
        {/* Header row with close button */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'flex-end',
          marginBottom:   '4px',
        }}>
          <button
            onClick={onClose}
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
            Close
          </button>
        </div>

        {items.map((item, i) => (
          <button
            key={i}
            onClick={item.onClick}
            style={{
              display:        'flex',
              alignItems:     'center',
              justifyContent: 'space-between',
              width:          '100%',
              textAlign:      'left',
              background:     'none',
              border:         'none',
              borderBottom:   '1px solid var(--color-border)',
              cursor:         'pointer',
              fontFamily:     'var(--font-sans)',
              fontSize:       'var(--text-body)',
              color:          'var(--color-text-primary)',
              padding:        '12px 0',
              minHeight:      '44px',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-brand-gold)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-primary)' }}
          >
            <span>{item.label}</span>
            {item.badge != null && (
              <span style={{
                fontSize:        '0.65rem',
                fontWeight:      600,
                padding:         '2px 7px',
                borderRadius:    '10px',
                backgroundColor: item.badgeColor ?? 'var(--color-border)',
                color:           item.badgeColor ? '#0D1120' : 'var(--color-text-secondary)',
                flexShrink:      0,
              }}>
                {item.badge}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>,
    document.body
  )
}

// ── Main export ──────────────────────────────────────────────────

export default function ReviewMoment({ data, onBack, onDispatch, readiness, cruiseAlt, isIFR, payload }) {
  const legs                = data?.legs ?? []
  const allReports          = legs.flatMap(l => l.reports ?? [])
  const hasConvectiveSigmet = legs.some(l => (l.routeIntelligence?.convectiveSigmets ?? []).length > 0)
  const overall    = worstRec(data)
  const color      = verdictColor(overall)
  const label      = verdictLabel(overall)
  const isBold     = overall === 'NOT_LEGAL'

  const depId = legs[0]?.departure
  const arrId = legs[legs.length - 1]?.arrival

  const imsafeYesCount = readiness
    ? Object.values(readiness.imsafe ?? {}).filter(v => v === true).length
    : 0

  // ── Collapsible section state (lifted for walkthrough control) ───
  const [showStations,   setShowStations]   = useState(true)
  const [showAdvisories, setShowAdvisories] = useState(hasConvectiveSigmet)
  const [showRouteIntel, setShowRouteIntel] = useState(false)
  const [showReadiness,  setShowReadiness]  = useState(false)

  // ── Section navigation FAB ───────────────────────────────────────
  const [showSectionNav, setShowSectionNav] = useState(false)

  // Advisory totals for the nav panel badge (mirrors AdvisoriesSection logic)
  const navAdvisoryCount = (() => {
    const g = dedup(legs.flatMap(l => l.routeIntelligence?.gairmets ?? []),            g => `${g.hazard}|${g.validFrom}|${g.validTo}|${g.product}`)
    const s = dedup(legs.flatMap(l => l.routeIntelligence?.sigmets ?? []),             s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`)
    const c = dedup(legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []),   s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`)
    const p = dedup(legs.flatMap(l => l.routeIntelligence?.pireps ?? []),              p => p.rawText ?? JSON.stringify(p))
    return g.length + s.length + c.length + p.length
  })()

  const navAdvBadgeColor = (() => {
    const c = dedup(legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []),   s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`)
    const s = dedup(legs.flatMap(l => l.routeIntelligence?.sigmets ?? []),             s => s.id ?? `${s.rawText}|${s.validFrom}|${s.validTo}`)
    if (c.length > 0) return 'var(--color-hazard)'
    if (s.length > 0) return 'var(--color-below)'
    return 'var(--color-marginal)'
  })()

  // Scroll + expand helper for the nav panel items
  function scrollToSectionRef(ref, expand) {
    if (expand) {
      expand()
      setTimeout(() => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  // ── Walkthrough ──────────────────────────────────────────────────
  const [walkthroughActive, setWalkthroughActive] = useState(false)
  const walkthroughStepRef = useRef(0)

  // Stable refs for top-level sections and outer containers
  const verdictRef            = useRef(null)
  const stationRef            = useRef(null)
  const advisoriesRef         = useRef(null)
  const advisoriesHeaderRef   = useRef(null)
  const routeIntelRef         = useRef(null)
  const readinessRef          = useRef(null)
  const beforeYouFlyRef       = useRef(null)
  const beforeYouFlyHeaderRef = useRef(null)

  // Mutable maps for granular sub-element refs (populated via callback refs during render)
  const stationCardRefs    = useRef({})  // '{legIndex}-{dep|arr}-{stationId}' → DOMElement
  const advisoryInnerRefs  = useRef({})  // sectionKey → DOMElement
  const routeIntelInnerRefs = useRef({}) // sectionKey → DOMElement

  // Resolves a step's section key to a live DOM element at call time
  const resolveRef = useCallback((sectionKey) => {
    if (!sectionKey) return null
    if (sectionKey === 'verdict')        return verdictRef.current
    if (sectionKey === 'advisories')     return advisoriesHeaderRef.current ?? advisoriesRef.current
    if (sectionKey === 'before-you-fly') return beforeYouFlyHeaderRef.current ?? beforeYouFlyRef.current
    if (sectionKey.startsWith('station-')) {
      const refKey = sectionKey.slice('station-'.length)
      const el = stationCardRefs.current[refKey] ?? null
      return el
    }
    return advisoryInnerRefs.current[sectionKey]
        ?? routeIntelInnerRefs.current[sectionKey]
        ?? null
  }, []) // reads mutable refs at call time — stable, no deps needed

  // Expands the collapsible section that contains the target element
  const expandSection = useCallback((sectionKey) => {
    if (sectionKey === 'stationReports') setShowStations(true)
    else if (sectionKey === 'advisories')   setShowAdvisories(true)
    else if (sectionKey === 'routeIntel')   setShowRouteIntel(true)
    else if (sectionKey === 'readiness')    setShowReadiness(true)
  }, [setShowStations, setShowAdvisories, setShowRouteIntel, setShowReadiness])

  const steps = useMemo(() => buildSteps(data, payload), [data, payload])

  // ── Derived flags for Before You Fly section ─────────────────────
  const allIntel       = legs.map(l => l.routeIntelligence).filter(Boolean)
  const hasTerrain     = allIntel.some(ri => (ri.terrain ?? []).length > 0)
  const ifrAltRequired = allIntel.some(ri => ri.ifrAlternateRequired === true)

  const beforeYouFlyItems = [
    'Check NOTAMs and TFRs — 1800wxbrief.com, ForeFlight, or FAA NOTAM search',
    'Obtain a standard weather briefing from 1800wxbrief.com or a certificated FSS',
    ...(isIFR ? ['Verify approach minimums from current approach plates'] : []),
    ...(isIFR && ifrAltRequired ? ['Confirm alternate airport weather if required'] : []),
    ...(hasTerrain ? ['Check sectional MEFs for terrain along your route'] : []),
    'Complete weight and balance using your aircraft POH',
  ]

  let summary
  if (overall === 'NOT_LEGAL')
    summary = 'One or more stations do not meet regulatory requirements for the selected flight rules.'
  else if (overall === 'BELOW')
    summary = hasConvectiveSigmet
      ? 'Convective SIGMET(s) present on route — review Advisories.'
      : 'One or more conditions are below active minimums for this route.'
  else if (overall === 'MARGINAL')
    summary = 'One or more conditions are near minimums. Review carefully.'
  else
    summary = 'Conditions meet all active minimums for this route.'

  return (
    <div
      className="flex-1 flex flex-col px-4"
      style={{
        maxWidth:      '640px',
        margin:        '0 auto',
        width:         '100%',
        paddingBottom: walkthroughActive ? `${Math.min(Math.round(window.innerHeight * 0.38), 320) + 48}px` : undefined,
      }}
    >
      {/* Walkthrough overlay — rendered outside the content flow */}
      {walkthroughActive && steps.length > 0 && (
        <WalkthroughOverlay
          steps={steps}
          initialStep={walkthroughStepRef.current}
          resolveRef={resolveRef}
          expandSection={expandSection}
          onStepChange={idx => { walkthroughStepRef.current = idx }}
          onExit={() => setWalkthroughActive(false)}
        />
      )}

      <div style={{ minHeight: '20px', flex: '0 1 48px' }} />

      {/* ── LAYER 1 — Overall verdict ───────────────────────── */}
      <div ref={verdictRef} style={{ marginBottom: '28px' }}>
        <span className="text-small" style={{ color: 'var(--color-text-muted)', display: 'block', marginBottom: '8px', letterSpacing: '0.06em' }}>
          PREFLIGHT SUMMARY
        </span>

        <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px', flexWrap: 'wrap', marginBottom: '8px' }}>
          <h2 style={{
            margin:     0,
            fontSize:   'var(--text-display)',
            fontWeight: isBold ? 700 : 600,
            color,
            fontFamily: 'var(--font-sans)',
            lineHeight: 1.2,
          }}>
            {label}
          </h2>
          {depId && arrId && (
            <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
              {depId} → {arrId}
            </span>
          )}
        </div>

        <p className="text-body" style={{ color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.55 }}>
          {summary}
        </p>

        {imsafeYesCount > 0 && (
          <p className="text-small" style={{ color: 'var(--color-text-muted)', margin: '0 0 12px', lineHeight: 1.55 }}>
            One or more pilot readiness items flagged — review Pilot Readiness section.
          </p>
        )}

        <button
          onClick={onBack}
          style={{
            background:  'none',
            border:      'none',
            cursor:      'pointer',
            color:       'var(--color-text-muted)',
            fontFamily:  'var(--font-sans)',
            fontSize:    'var(--text-label)',
            padding:     '0',
            minHeight:   '44px',
            display:     'inline-flex',
            alignItems:  'center',
          }}
          onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-muted)' }}
        >
          ← Adjust inputs
        </button>
      </div>

      {/* ── Walkthrough entry ───────────────────────────────── */}
      {steps.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <button
            onClick={() => setWalkthroughActive(true)}
            style={{
              background:  'none',
              border:      '1px solid var(--color-border)',
              borderRadius:'8px',
              cursor:      'pointer',
              fontFamily:  'var(--font-sans)',
              fontSize:    'var(--text-label)',
              color:       'var(--color-text-secondary)',
              padding:     '10px 16px',
              width:       '100%',
              textAlign:   'left',
              display:     'flex',
              alignItems:  'center',
              gap:         '8px',
              transition:  'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)';     e.currentTarget.style.color = 'var(--color-text-secondary)' }}
          >
            <span style={{ color: 'var(--color-brand-gold)', fontSize: '0.8rem' }}>▶</span>
            Walk me through this
          </button>
        </div>
      )}

      {/* ── LAYER 2 — Station reports ───────────────────────── */}
      <div ref={stationRef}>
      <CollapsibleSection
        title="Station Reports"
        badge={allReports.length || undefined}
        open={showStations}
        onToggle={setShowStations}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
          {legs.map((leg, li) => (
            <div key={li}>
              {legs.length > 1 && (
                <div style={{ marginBottom: '8px', marginTop: li > 0 ? '4px' : 0 }}>
                  <span className="font-mono text-small" style={{ color: 'var(--color-text-muted)' }}>
                    Leg {li + 1}: {leg.departure} → {leg.arrival}
                  </span>
                </div>
              )}
              {(leg.reports ?? []).map((report, ri) => {
                const role = report.departureAnalysis ? 'dep' : 'arr'
                return (
                  <div key={`${li}-${ri}`} ref={el => { stationCardRefs.current[`${li}-${role}-${report.station}`] = el }}>
                    <StationCard report={report} />
                  </div>
                )
              })}
            </div>
          ))}
          {allReports.length === 0 && (
            <p className="text-small" style={{ color: 'var(--color-text-muted)', margin: 0 }}>No station reports.</p>
          )}
        </div>
      </CollapsibleSection>
      </div>{/* /stationRef */}

      {/* ── LAYER 3 — Advisories ────────────────────────────── */}
      <div ref={advisoriesRef}>
        <AdvisoriesSection
          legs={legs}
          open={showAdvisories}
          onToggle={setShowAdvisories}
          innerRefs={advisoryInnerRefs}
          headerRef={advisoriesHeaderRef}
        />
      </div>

      {/* ── LAYER 4 — Route Intelligence ────────────────────── */}
      <div ref={routeIntelRef}>
        <RouteIntelSection
          legs={legs}
          cruiseAlt={cruiseAlt}
          open={showRouteIntel}
          onToggle={setShowRouteIntel}
          innerRefs={routeIntelInnerRefs}
        />
      </div>

      {/* ── LAYER 5 — Pilot Readiness ───────────────────────── */}
      <div ref={readinessRef}>
        <PilotReadinessLayer
          readiness={readiness}
          open={showReadiness}
          onToggle={setShowReadiness}
        />
      </div>

      {/* ── Before You Fly ──────────────────────────────────── */}
      <div ref={beforeYouFlyRef} style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '4px' }}>
        <span
          ref={beforeYouFlyHeaderRef}
          className="text-label font-medium"
          style={{ color: 'var(--color-text-secondary)', display: 'block', marginBottom: '12px' }}
        >
          Before You Fly
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {beforeYouFlyItems.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
              <span style={{
                flexShrink:  0,
                lineHeight:  1.5,
                fontSize:    '0.85rem',
                color:       'var(--color-text-muted)',
                userSelect:  'none',
              }}>
                ☐
              </span>
              <span className="text-small" style={{ color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                {item}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Save / Dispatch ─────────────────────────────────── */}
      {onDispatch && (
        <div style={{ borderTop: '1px solid var(--color-border)', paddingTop: '20px', marginTop: '4px' }}>
          <button
            onClick={onDispatch}
            style={{
              width:           '100%',
              height:          '48px',
              backgroundColor: 'var(--color-surface-2)',
              color:           'var(--color-text-primary)',
              border:          '1px solid var(--color-border)',
              borderRadius:    '10px',
              cursor:          'pointer',
              fontFamily:      'var(--font-sans)',
              fontSize:        'var(--text-label)',
              fontWeight:      500,
              display:         'flex',
              alignItems:      'center',
              justifyContent:  'center',
              gap:             '8px',
              transition:      'border-color 0.15s, color 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--color-text-muted)'; e.currentTarget.style.color = 'var(--color-text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--color-border)';     e.currentTarget.style.color = 'var(--color-text-primary)' }}
          >
            Save Preflight Summary →
          </button>
        </div>
      )}

      <div style={{ minHeight: '48px' }} />

      {/* ── Section navigation FAB — hidden when walkthrough is active ── */}
      {!walkthroughActive && (
        <button
          onClick={() => setShowSectionNav(true)}
          aria-label="Jump to section"
          style={{
            position:        'fixed',
            bottom:          '24px',
            right:           '20px',
            zIndex:          8999,
            width:           '44px',
            height:          '44px',
            borderRadius:    '50%',
            backgroundColor: 'var(--color-brand-gold)',
            border:          'none',
            cursor:          'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            boxShadow:       '0 4px 16px rgba(0,0,0,0.45)',
            fontSize:        '1.2rem',
            lineHeight:      1,
            color:           '#0D1120',
          }}
          onMouseEnter={e => { e.currentTarget.style.opacity = '0.9' }}
          onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
        >
          ≡
        </button>
      )}

      {showSectionNav && !walkthroughActive && (
        <SectionNavPanel
          onClose={() => setShowSectionNav(false)}
          items={[
            {
              label:   'Trip Overview',
              onClick: () => { setShowSectionNav(false); scrollToSectionRef(verdictRef) },
            },
            {
              label:   'Station Reports',
              badge:   allReports.length || undefined,
              onClick: () => { setShowSectionNav(false); scrollToSectionRef(stationRef, () => setShowStations(true)) },
            },
            {
              label:      'Advisories',
              badge:      navAdvisoryCount || undefined,
              badgeColor: navAdvisoryCount > 0 ? navAdvBadgeColor : undefined,
              onClick:    () => { setShowSectionNav(false); scrollToSectionRef(advisoriesRef, () => setShowAdvisories(true)) },
            },
            {
              label:   'Route Intelligence',
              onClick: () => { setShowSectionNav(false); scrollToSectionRef(routeIntelRef, () => setShowRouteIntel(true)) },
            },
            {
              label:   'Pilot Readiness',
              onClick: () => { setShowSectionNav(false); scrollToSectionRef(readinessRef, () => setShowReadiness(true)) },
            },
            {
              label:   'Before You Fly',
              onClick: () => { setShowSectionNav(false); scrollToSectionRef(beforeYouFlyRef) },
            },
          ]}
        />
      )}
    </div>
  )
}
