import { WT, interpolate } from '../data/walkthroughStrings'

// ── Shared helpers ────────────────────────────────────────────────

function recKey(rec) {
  if (!rec) return 'WITHIN'
  const u = rec.toUpperCase().replace(/_/g, ' ')
  if (u.includes('NOT LEGAL')) return 'NOT_LEGAL'
  if (u.includes('BELOW'))     return 'BELOW'
  if (u.includes('MARGINAL'))  return 'MARGINAL'
  return 'WITHIN'
}

function worstRecKey(data) {
  const order = { NOT_LEGAL: 4, BELOW: 3, MARGINAL: 2, WITHIN: 1 }
  let best = 'WITHIN', bestOrder = 1
  for (const leg of data?.legs ?? []) {
    for (const report of leg.reports ?? []) {
      const k = recKey(report.recommendation)
      const o = order[k] ?? 1
      if (o > bestOrder) { bestOrder = o; best = k }
    }
    if ((leg.routeIntelligence?.convectiveSigmets ?? []).length > 0) {
      if (order.BELOW > bestOrder) { bestOrder = order.BELOW; best = 'BELOW' }
    }
  }
  return best
}

function dedup(arr, keyFn) {
  const seen = new Set()
  return arr.filter(item => {
    const k = keyFn(item)
    if (seen.has(k)) return false
    seen.add(k); return true
  })
}

// Parse a freezing level value (string or number) like "8000 ft MSL", "FL180", "SFC", 8000 → numeric feet
function parseFzl(val) {
  if (val == null) return null
  const str = String(val)
  const up = str.toUpperCase()
  if (up.includes('SFC')) return 0
  if (up.startsWith('FL')) {
    const n = parseInt(str.slice(2))
    return isNaN(n) ? null : n * 100
  }
  const m = str.match(/(\d+)/)
  if (m) return parseInt(m[1])
  return null
}

// Maps a G-AIRMET item to the canonical gKey used for both step.section and advisory grouping
export function gairmetProductKey(g) {
  const product = (g.product || g.hazard || '').toUpperCase()
  if (product.includes('SIERRA') && (product.includes('MT') || product.includes('OBSC'))) return 'SIERRA_MT_OBSC'
  if (product.includes('SIERRA')) return 'SIERRA_IFR'
  if (product.includes('TANGO') && product.includes('LLWS')) return 'TANGO_LLWS'
  if (product.includes('TANGO') && product.includes('HI'))   return 'TANGO_TURB_HI'
  if (product.includes('TANGO')) return 'TANGO_TURB_LO'
  if (product.includes('ZULU') && product.includes('FZLVL')) return 'ZULU_FZLVL'
  if (product.includes('ZULU')) return 'ZULU_ICING'
  return 'SIERRA_IFR'
}

// ── Main export ───────────────────────────────────────────────────

export function buildSteps(data, payload) {
  try {
  const legs      = data?.legs ?? []
  const flight    = payload?.flight   ?? {}
  const minimums  = payload?.minimums ?? {}
  const cruiseAlt = flight.cruiseAlt != null ? Number(flight.cruiseAlt) : null
  const isIFR     = !!flight.isIFR
  const isSolo    = !!flight.isSolo
  const flightMode = isIFR ? 'IFR' : 'VFR'

  // Personal minimums (nested under personalMins)
  const pm = minimums.personalMins ?? {}
  const persMinCeil = pm.ceilingFt         != null ? Number(pm.ceilingFt)         : null
  const persMinVis  = pm.visibilitySM      != null ? Number(pm.visibilitySM)      : null
  const persMaxXwd  = pm.crosswindKts      != null ? Number(pm.crosswindKts)      : (minimums.schoolMins?.crosswindKts != null ? Number(minimums.schoolMins.crosswindKts) : null)
  const persMaxWind = pm.windKts           != null ? Number(pm.windKts)           : null
  const persNoGoDA  = pm.densityAltitudeFt != null ? Number(pm.densityAltitudeFt) : null

  const steps = []

  // ── 1. Trip Overview ─────────────────────────────────────────────
  const hasConvSigmet = legs.some(l => (l.routeIntelligence?.convectiveSigmets ?? []).length > 0)
  const worst = worstRecKey(data)

  let statusKey
  if (hasConvSigmet)              statusKey = 'CONVECTIVE_SIGMET'
  else if (worst === 'NOT_LEGAL') statusKey = 'NOT_LEGAL'
  else if (worst === 'BELOW')     statusKey = 'BELOW_MINIMUMS'
  else if (worst === 'MARGINAL')  statusKey = 'MARGINAL'
  else                            statusKey = 'WITHIN_MINIMUMS'

  steps.push({
    id:      'trip_overview',
    title:   'Trip Overview',
    section: 'verdict',
    text:    interpolate(WT.STATUS[statusKey], { flightMode }),
  })

  // ── 2. Per-leg, per-report station steps ─────────────────────────
  // seenStations: station → { recommendation, visitCount }
  // Reports are emitted in flight order: departure analysis first, then arrival analysis per leg.
  const seenStations = new Map()

  for (let li = 0; li < legs.length; li++) {
    const leg = legs[li]
    // Partition into departure-first then arrival within each leg
    const legReports = leg.reports ?? []
    const depReports = legReports.filter(r => r.departureAnalysis)
    const arrReports = legReports.filter(r => !r.departureAnalysis && r.arrivalAnalysis)
    const orderedReports = [...depReports, ...arrReports]

    for (const report of orderedReports) {
      const station  = report.station ?? '???'
      const analysis = report.departureAnalysis || report.arrivalAnalysis || {}
      const da       = analysis.densityAltitude || {}
      // role drives the section key — each leg+role+station combo gets a unique ref
      const role     = report.departureAnalysis ? 'dep' : 'arr'
      const sectionKey = `station-${li}-${role}-${station}`

      const prior = seenStations.get(station)

      if (prior) {
        // Repeat occurrence — single summary step comparing to prior recommendation
        prior.visitCount++
        const vc = prior.visitCount
        const ORDER = { NOT_LEGAL: 4, BELOW: 3, MARGINAL: 2, WITHIN: 1 }
        const prevOrder = ORDER[recKey(prior.recommendation)] ?? 1
        const currOrder = ORDER[recKey(report.recommendation)] ?? 1
        const repeatKey = currOrder > prevOrder ? 'WORSE' : currOrder < prevOrder ? 'BETTER' : 'SAME'
        steps.push({
          id:            `stn_${station}_v${vc}_summary`,
          title:         `${station} — Arrival Conditions`,
          section:       sectionKey,
          parentSection: 'stationReports',
          text:          interpolate(WT.STATION_REPEAT[repeatKey], {
            station,
            arrivalRecommendation: report.recommendation ?? 'Within Minimums',
          }),
        })

        // TAF sub-step if present on this repeated report
        if (report.taf) {
          const tafText = (typeof report.taf === 'string' ? report.taf : '').toUpperCase()
          let tafKey = 'IMPROVING'
          if (tafText.includes('TEMPO'))       tafKey = 'TEMPO'
          else if (tafText.includes('PROB30')) tafKey = 'PROB30'
          else if (tafText.includes('FM') && (tafText.includes('BKN0') || tafText.includes('OVC0'))) tafKey = 'DETERIORATING'
          steps.push({
            id:            `stn_${station}_v${vc}_taf`,
            title:         `${station} — Forecast`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.TAF[tafKey], { station }),
          })
        }

      } else {
        // First occurrence — register and generate all sub-steps
        seenStations.set(station, { recommendation: report.recommendation, visitCount: 1 })

        // 2a. Flight Category
        const fc    = (analysis.flightCategory ?? '').toUpperCase()
        const fcKey = ['VFR', 'MVFR', 'IFR', 'LIFR'].includes(fc) ? fc : 'UNKNOWN'
        steps.push({
          id:            `stn_${station}_cat`,
          title:         `${station} — Flight Category`,
          section:       sectionKey,
          parentSection: 'stationReports',
          text:          interpolate(WT.FLIGHT_CATEGORY[fcKey], { station }),
        })

        // 2b. Ceiling
        const ceilFt = analysis.ceilingFt ?? null
        if (ceilFt !== null || analysis.ceilingLabel) {
          const ceilVal = ceilFt ?? analysis.ceilingLabel ?? '—'
          let ceilKey
          if (ceilFt === null)                            ceilKey = 'CLEAR'
          else if (ceilFt < 1000)                         ceilKey = 'BELOW_FAA'
          else if (persMinCeil && ceilFt < persMinCeil)   ceilKey = 'BELOW_PERSONAL'
          else                                            ceilKey = 'ABOVE_PERSONAL'
          steps.push({
            id:            `stn_${station}_ceil`,
            title:         `${station} — Ceiling`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.CEILING[ceilKey], { station, ceilingFt: ceilVal, personalMinCeil: persMinCeil ?? 1000 }),
          })
        }

        // 2c. Visibility
        const vis = analysis.visibility ?? null
        if (vis !== null) {
          let visKey
          if (vis < 3)                               visKey = 'BELOW_FAA'
          else if (persMinVis && vis < persMinVis)   visKey = 'BELOW_PERSONAL'
          else if (vis >= 10)                        visKey = 'GOOD'
          else                                       visKey = 'ABOVE_PERSONAL'
          steps.push({
            id:            `stn_${station}_vis`,
            title:         `${station} — Visibility`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.VISIBILITY[visKey], { station, visSM: vis, personalMinVis: persMinVis ?? 3 }),
          })
        }

        // 2d. Wind
        const windSpeed = analysis.windSpeed ?? null
        if (windSpeed !== null) {
          const windDir        = analysis.windDir   ?? null
          const gustSpeed      = analysis.gustSpeed ?? null
          const crosswind      = analysis.crosswind ?? null
          const crosswindIsVrb = analysis.crosswindIsVrb === true
          const gustFactor     = (gustSpeed != null && windSpeed != null) ? gustSpeed - windSpeed : null

          // Use the backend recommendation as the authority on whether thresholds are exceeded.
          // Raw values can appear to exceed personal minimums due to rounding or different
          // threshold sets — the server-side recommendation is the ground truth.
          const windRec          = analysis.recommendation ?? report.recommendation ?? ''
          const isWithinMinimums = recKey(windRec) === 'WITHIN'

          let windKey
          if (crosswindIsVrb) {
            windKey = 'VRB'
          } else if (windSpeed === 0) {
            windKey = 'CALM'
          } else if (!isWithinMinimums && crosswind != null && persMaxXwd && crosswind > persMaxXwd) {
            windKey = 'CROSSWIND_EXCEEDED'
          } else if (!isWithinMinimums && persMaxWind && windSpeed > persMaxWind) {
            windKey = 'TOTAL_EXCEEDED'
          } else if (crosswind != null && persMaxXwd && crosswind >= persMaxXwd * 0.8) {
            windKey = 'CROSSWIND_HIGH'
          } else if (gustSpeed != null) {
            windKey = isWithinMinimums ? 'GUSTING_INFO' : 'GUSTING_EXCEEDED'
          } else if (crosswind != null && crosswind > 0) {
            windKey = 'CROSSWIND'
          } else if (windSpeed <= 10) {
            windKey = 'LIGHT'
          } else {
            windKey = 'WITHIN_LIMITS'
          }
          steps.push({
            id:            `stn_${station}_wind`,
            title:         `${station} — Wind`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.WIND[windKey], {
              station, windSpeed, windDir: windDir ?? 'VRB',
              gustSpeed, gustFactor, crosswind,
              maxXwd: persMaxXwd, maxTotalWind: persMaxWind,
              maxGustKts: persMaxWind ?? '—',
            }),
          })
        }

        // 2e. Density Altitude
        if (da.densityAlt != null) {
          const densityAlt   = Math.round(da.densityAlt)
          const fieldElev    = da.fieldElevation ?? da.elevationFt ?? 0
          const daAboveField = Math.round(densityAlt - fieldElev)
          const cautionDA    = persNoGoDA ? Math.round(persNoGoDA * 0.8) : null

          let daKey
          if (densityAlt < 0)                            daKey = 'NEGATIVE'
          else if (persNoGoDA && densityAlt > persNoGoDA) daKey = 'BELOW_MINIMUMS'
          else if (cautionDA && densityAlt > cautionDA)   daKey = 'CAUTION'
          else                                            daKey = 'NORMAL'
          steps.push({
            id:            `stn_${station}_da`,
            title:         `${station} — Density Altitude`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.DENSITY_ALTITUDE[daKey], {
              station,
              densityAlt:   densityAlt.toLocaleString(),
              daAboveField: daAboveField.toLocaleString(),
              cautionDA:    cautionDA ? cautionDA.toLocaleString() : '—',
              noGoDA:       persNoGoDA ? Math.round(persNoGoDA).toLocaleString() : '—',
            }),
          })
        }

        // 2f. Temp/Dewpoint Spread (only if both available)
        const tempC = analysis.tempC     ?? da.tempC     ?? null
        const dewC  = analysis.dewpointC ?? da.dewpointC ?? null
        if (tempC != null && dewC != null) {
          const spread    = Math.round((tempC - dewC) * 10) / 10
          const spreadKey = spread <= 3 ? 'CRITICAL' : spread <= 5 ? 'CAUTION' : 'GOOD'
          steps.push({
            id:            `stn_${station}_spread`,
            title:         `${station} — Conditions`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.SPREAD[spreadKey], { station, spread }),
          })
        }

        // 2g. Day/Night
        if (analysis.isNight != null) {
          let dnKey
          if (analysis.isNight && isSolo) dnKey = 'NIGHT_SOLO'
          else if (analysis.isNight)      dnKey = 'NIGHT'
          else                            dnKey = 'DAY'
          steps.push({
            id:            `stn_${station}_daynight`,
            title:         `${station} — Day/Night`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.DAY_NIGHT[dnKey], { station }),
          })
        }

        // 2h. TAF (only if report has one)
        if (report.taf) {
          const tafText = (typeof report.taf === 'string' ? report.taf : '').toUpperCase()
          let tafKey = 'IMPROVING'
          if (tafText.includes('TEMPO'))       tafKey = 'TEMPO'
          else if (tafText.includes('PROB30')) tafKey = 'PROB30'
          else if (tafText.includes('FM') && (tafText.includes('BKN0') || tafText.includes('OVC0'))) tafKey = 'DETERIORATING'
          steps.push({
            id:            `stn_${station}_taf`,
            title:         `${station} — Forecast`,
            section:       sectionKey,
            parentSection: 'stationReports',
            text:          interpolate(WT.TAF[tafKey], { station }),
          })
        }
      }
    }
  }

  // ── 3–7. Advisories ──────────────────────────────────────────────
  const allGairmets = dedup(legs.flatMap(l => l.routeIntelligence?.gairmets         ?? []), g => `${g.hazard}|${g.product}`)
  const allSigmets  = dedup(legs.flatMap(l => l.routeIntelligence?.sigmets           ?? []), s => s.id ?? s.rawText ?? JSON.stringify(s))
  const allConvSigs = dedup(legs.flatMap(l => l.routeIntelligence?.convectiveSigmets ?? []), s => s.id ?? s.rawText ?? JSON.stringify(s))
  const allPireps   = dedup(legs.flatMap(l => l.routeIntelligence?.pireps            ?? []), p => p.rawText ?? JSON.stringify(p))

  const hasAdvisories = allGairmets.length + allSigmets.length + allConvSigs.length + allPireps.length > 0

  if (hasAdvisories) {
    // Intro — spotlights the outer advisories container
    const sigCount = allGairmets.length + allSigmets.length + allConvSigs.length
    let introText
    if (sigCount === 0 && allPireps.length > 0) {
      introText = `No active advisories on your route. ${allPireps.length} pilot report${allPireps.length > 1 ? 's' : ''} available — review below.`
    } else {
      const parts = []
      if (allGairmets.length) parts.push(`${allGairmets.length} G-AIRMET${allGairmets.length > 1 ? 's' : ''}`)
      if (allSigmets.length)  parts.push(`${allSigmets.length} SIGMET${allSigmets.length > 1 ? 's' : ''}`)
      if (allConvSigs.length) parts.push(`${allConvSigs.length} Convective SIGMET${allConvSigs.length > 1 ? 's' : ''}`)
      introText = `${parts.join(', ')} active on your route. Review each advisory carefully.`
    }
    steps.push({ id: 'advisories_intro', title: 'Advisories', section: 'advisories', text: introText })

    // G-AIRMETs — one step per unique product key
    const seenGKeys = new Set()
    for (const g of allGairmets) {
      const gKey = gairmetProductKey(g)
      if (seenGKeys.has(gKey)) continue
      seenGKeys.add(gKey)
      steps.push({
        id:            `gairmet_${gKey}`,
        title:         `G-AIRMET — ${(g.product || g.hazard || gKey).toUpperCase()}`,
        section:       `gairmet-${gKey}`,
        parentSection: 'advisories',
        text:          WT.GAIRMETS[gKey],
      })
    }

    // SIGMETs
    if (allSigmets.length > 0) {
      steps.push({
        id:            'sigmets',
        title:         'SIGMETs',
        section:       'sigmets',
        parentSection: 'advisories',
        text:          WT.SIGMETS.ACTIVE,
      })
    }

    // Convective SIGMETs
    if (allConvSigs.length > 0) {
      steps.push({
        id:            'conv_sigmets',
        title:         'Convective SIGMETs',
        section:       'convective-sigmets',
        parentSection: 'advisories',
        text:          WT.SIGMETS.CONVECTIVE,
      })
    }

    // PIREPs — only when reports are present
    if (allPireps.length > 0) {
      const pirepStr = allPireps.map(p => p.rawText ?? '').join(' ').toUpperCase()
      let pirepKey = 'AVAILABLE'
      if (pirepStr.includes('ICING') || pirepStr.includes(' ICE '))    pirepKey = 'ICING'
      else if (pirepStr.includes('TURB') || pirepStr.includes('CHOP')) pirepKey = 'TURBULENCE'
      steps.push({
        id:            'pireps',
        title:         'PIREPs',
        section:       'pireps',
        parentSection: 'advisories',
        text:          WT.PIREPS[pirepKey],
      })
    }
  }

  // ── 8. Per-leg route intelligence ────────────────────────────────
  for (let li = 0; li < legs.length; li++) {
    const ri = legs[li].routeIntelligence
    if (!ri) continue
    const legLabel = legs.length > 1 ? ` — Leg ${li + 1}` : ''

    // 8a. Winds Aloft
    if (ri.windsAloft) {
      const hw        = ri.windsAloft.headwindComponent ?? {}
      const component = hw.component != null ? Math.abs(hw.component) : null

      if (component != null && component > 0) {
        const isHead = !!hw.isHeadwind
        let waKey
        if (component < 5)        waKey = isHead ? 'HEADWIND_LIGHT'    : 'TAILWIND_LIGHT'
        else if (component <= 20) waKey = isHead ? 'HEADWIND_MODERATE' : 'TAILWIND_MODERATE'
        else                      waKey = isHead ? 'HEADWIND_STRONG'   : 'TAILWIND_STRONG'
        steps.push({
          id:            `wa_${li}`,
          title:         `Winds Aloft${legLabel}`,
          section:       `winds-leg-${li}`,
          parentSection: 'routeIntel',
          text:          interpolate(WT.WINDS_ALOFT[waKey], { component }),
        })
      } else {
        steps.push({
          id:            `wa_${li}`,
          title:         `Winds Aloft${legLabel}`,
          section:       `winds-leg-${li}`,
          parentSection: 'routeIntel',
          text:          WT.WINDS_ALOFT.CALM,
        })
      }

      // 8b. Freezing Level
      if (ri.windsAloft.freezingLevel && cruiseAlt != null) {
        const fzlFt = parseFzl(ri.windsAloft.freezingLevel)
        if (fzlFt != null) {
          let fzlKey
          if (fzlFt > cruiseAlt + 2000)      fzlKey = 'WELL_ABOVE'
          else if (fzlFt >= cruiseAlt - 2000) fzlKey = 'NEAR_CRUISE'
          else                                fzlKey = 'BELOW_CRUISE'
          steps.push({
            id:            `fzl_${li}`,
            title:         `Freezing Level${legLabel}`,
            section:       `freezing-level-${li}`,
            parentSection: 'routeIntel',
            text:          interpolate(WT.FREEZING_LEVEL[fzlKey], {
              fzlFt:     fzlFt.toLocaleString(),
              cruiseAlt: cruiseAlt.toLocaleString(),
            }),
          })
        }
      }
    }
  }

  // ── 9. Hemispheric Rule (VFR only) ───────────────────────────────
  if (!isIFR) {
    const firstRI = legs.find(l => l.routeIntelligence?.hemispheric)?.routeIntelligence
    if (firstRI?.hemispheric) {
      const h    = firstRI.hemispheric
      const hKey = h.pass ? 'PASS' : 'FAIL'
      steps.push({
        id:            'hemispheric',
        title:         'Hemispheric Rule',
        section:       'hemispheric',
        parentSection: 'routeIntel',
        text:          interpolate(WT.HEMISPHERIC[hKey], {
          cruiseAlt: cruiseAlt != null ? cruiseAlt.toLocaleString() : '—',
          direction: h.direction ?? '—',
          course:    h.course    ?? '—',
        }),
      })
    }
  }

  // ── 10. SFRAs ────────────────────────────────────────────────────
  const allSfras = dedup(
    legs.flatMap(l => l.routeIntelligence?.sfras ?? []),
    s => s.id ?? s.name ?? JSON.stringify(s)
  )
  for (const sfra of allSfras) {
    const name = (sfra.name ?? '').toUpperCase()
    let sfraKey
    if (name.includes('FRZ') || name.includes('FLIGHT RESTRICTED')) {
      sfraKey = 'DC_FRZ_INSIDE'
    } else if (name.includes('DC') || name.includes('WASH') || name.includes('SFRA')) {
      sfraKey = sfra.inside ? 'DC_SFRA_INSIDE' : 'DC_SFRA_PROXIMITY'
    } else {
      sfraKey = 'OTHER_SFRA'
    }
    const sfraId = (sfra.name ?? sfra.id ?? '').replace(/\W+/g, '_')
    steps.push({
      id:            `sfra_${sfraId}`,
      title:         `Special Use Airspace — ${sfra.name ?? 'Airspace'}`,
      section:       `sfra-${sfraId}`,
      parentSection: 'routeIntel',
      text:          interpolate(WT.SFRA[sfraKey], {
        distNm:   sfra.distNm != null ? Math.ceil(sfra.distNm) : '—',
        sfraName: sfra.name ?? 'Special Use Airspace',
      }),
    })
  }

  // ── 11. Terrain ──────────────────────────────────────────────────
  const allTerrain = dedup(
    legs.flatMap(l => l.routeIntelligence?.terrain ?? []),
    t => typeof t === 'string' ? t : (t.note ?? t.warning ?? JSON.stringify(t))
  )
  if (allTerrain.length > 0) {
    const terrainStr = allTerrain
      .map(t => typeof t === 'string' ? t : (t.note ?? t.warning ?? ''))
      .join(' ').toUpperCase()
    let terrainKey = 'APPALACHIANS'
    if (terrainStr.includes('ROCK'))    terrainKey = 'ROCKIES'
    if (terrainStr.includes('SIERRA'))  terrainKey = 'SIERRA'
    if (terrainStr.includes('CASCADE')) terrainKey = 'CASCADES'
    steps.push({
      id:            'terrain',
      title:         'Terrain',
      section:       'terrain',
      parentSection: 'routeIntel',
      text:          WT.TERRAIN[terrainKey],
    })
  }

  // ── 12. IFR Alternate ────────────────────────────────────────────
  if (isIFR) {
    const allIntel    = legs.map(l => l.routeIntelligence).filter(Boolean)
    const ifrAltEntry = allIntel.find(ri => ri.ifrAlternateRequired != null)
    if (ifrAltEntry) {
      const val    = ifrAltEntry.ifrAlternateRequired
      const altKey = val === true ? 'REQUIRED' : val === false ? 'NOT_REQUIRED' : 'NULL'
      steps.push({
        id:            'ifr_alt',
        title:         'IFR Alternate',
        section:       'ifr-alternate',
        parentSection: 'routeIntel',
        text:          WT.IFR_ALTERNATE[altKey],
      })
    }
  }

  // ── 13. CONUS Warning ────────────────────────────────────────────
  const conusWarn = legs.map(l => l.routeIntelligence).filter(Boolean)
    .find(ri => ri.conusWarning)?.conusWarning
  if (conusWarn) {
    steps.push({
      id:            'conus',
      title:         'Route Boundary',
      section:       'conus',
      parentSection: 'routeIntel',
      text:          WT.CONUS.WARNING,
    })
  }

  // ── 14. Before You Fly (always final) ────────────────────────────
  const hasTerrain     = allTerrain.length > 0
  const ifrAltRequired = legs.map(l => l.routeIntelligence).filter(Boolean)
    .some(ri => ri.ifrAlternateRequired === true)

  const byfItems = [
    WT.BEFORE_YOU_FLY.NOTAMS,
    WT.BEFORE_YOU_FLY.WEATHER_CHECK,
    ...(isIFR ? [WT.BEFORE_YOU_FLY.APPROACH_MINIMUMS] : []),
    ...(isIFR && ifrAltRequired ? [WT.BEFORE_YOU_FLY.ALTERNATE_WEATHER] : []),
    ...(hasTerrain ? [WT.BEFORE_YOU_FLY.TERRAIN] : []),
    WT.BEFORE_YOU_FLY.WB,
  ]

  steps.push({
    id:      'before_you_fly',
    title:   'Before You Fly',
    section: 'before-you-fly',
    items:   byfItems,
  })

  return steps
  } catch (e) {
    return []
  }
}
