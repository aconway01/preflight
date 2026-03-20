// ============================================================
// Central Aviation — Preflight
// data.js — Frontend reference data
//
// MINIMUMS HIERARCHY (most restrictive wins at each level):
//   FAA → School General → School Aircraft → School Student →
//   School Student Aircraft → Instructor General →
//   Instructor Aircraft → Instructor Student →
//   Instructor Student Aircraft → Personal
//
// null at any level means "not set here — fall through to next level"
// FAA minimums are always fully populated and serve as absolute floor.
// ============================================================

const CA_DATA = {

  // ── Apps Script URL ──
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyRVu18oSRhNup9-jjDKYc3uuH5mW8j-lTv6-4s38KOUsWfOqDSzajmvgxuRcpQ20bB/exec',

  // ── FAA Minimums ──
  // Absolute legal floors. Immutable. Never overridden.
  // FAR 91.155 (VFR), FAR 91.167/91.169 (IFR), FAR 61.89 (solo), FAR 91.211 (O2)
  FAA_MINIMUMS: {
    vfr_day: {
      minVis:         3,     // SM — controlled airspace (Class B/C/D/E)
      minCeil:        1000,  // ft AGL
      maxXwd:         null,  // no FAA limit — POH governs
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: null,
    },
    vfr_night: {
      minVis:         3,
      minCeil:        1000,
      maxXwd:         null,
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: 12500, // ft MSL — O2 required >30min above this (FAR 91.211)
    },
    ifr: {
      minVis:         null,  // approach-specific — verify plates
      minCeil:        null,  // approach-specific — verify plates
      maxXwd:         null,
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: 12500,
    },
    solo: {
      minVis:         3,     // SM — FAR 61.89(a)(6)
      minCeil:        1000,  // ft AGL — FAR 61.89(a)(6)
      maxXwd:         null,
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: null,
    },
  },

  // ── School Configuration ──
  SCHOOL: {
    id:   'central-aviation',
    name: 'Central Aviation',

    minimums: {
      vfr_day: {
        minVis:         5,
        minCeil:        2500,
        maxXwd:         12,
        maxTotalWind:   20,
        maxGust:        18,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: null,
      },
      vfr_night: {
        minVis:         5,
        minCeil:        3000,
        maxXwd:         10,
        maxTotalWind:   15,
        maxGust:        15,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: 12500,
      },
      ifr: {
        minVis:         1,
        minCeil:        200,
        maxXwd:         15,
        maxTotalWind:   25,
        maxGust:        20,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: null,
      },
      solo: {
        minVis:         5,
        minCeil:        3000,
        maxXwd:         10,
        maxTotalWind:   15,
        maxGust:        15,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: null,
      },
    },

    // Per-aircraft overrides keyed by tail number
    aircraft_minimums: {
      // 'N12345': { vfr_day: { maxXwd: 10 } }
    },

    // Per-student overrides keyed by student cert number
    student_minimums: {
      // 'A1234567': { vfr_day: { minVis: 6 } }
    },

    // Per-student per-aircraft overrides
    student_aircraft_minimums: {
      // 'A1234567': { 'N12345': { solo: { maxXwd: 8 } } }
    },
  },

  // ── Instructors ──
  INSTRUCTORS: [
    {
      id:   'andy-conway',
      name: 'Andy Conway',
      cert: '',

      minimums: {
        vfr_day: {
          minVis:         5,
          minCeil:        2500,
          maxXwd:         12,
          maxTotalWind:   20,
          maxGust:        18,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: null,
        },
        vfr_night: {
          minVis:         5,
          minCeil:        3000,
          maxXwd:         10,
          maxTotalWind:   15,
          maxGust:        15,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: 12500,
        },
        ifr: {
          minVis:         1,
          minCeil:        200,
          maxXwd:         15,
          maxTotalWind:   25,
          maxGust:        20,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: null,
        },
        solo: {
          minVis:         5,
          minCeil:        3000,
          maxXwd:         10,
          maxTotalWind:   15,
          maxGust:        15,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: null,
        },
      },

      aircraft_minimums:         {},
      student_minimums:          {},
      student_aircraft_minimums: {},
    },
  ],

  // ── Default Personal Minimums ──
  // Pre-populated into the personal minimums fields on page load.
  // Pilot may only set values at or above the resolved instructor floor.
  DEFAULT_PERSONAL_MINS: {
    vfr_day: {
      minVis:         5,
      minCeil:        2500,
      maxXwd:         12,
      maxTotalWind:   20,
      maxGust:        18,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: null,
    },
    vfr_night: {
      minVis:         5,
      minCeil:        3000,
      maxXwd:         10,
      maxTotalWind:   15,
      maxGust:        15,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: 12500,
    },
    ifr: {
      minVis:         1,
      minCeil:        200,
      maxXwd:         15,
      maxTotalWind:   25,
      maxGust:        20,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: null,
    },
    solo: {
      minVis:         5,
      minCeil:        3000,
      maxXwd:         10,
      maxTotalWind:   15,
      maxGust:        15,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: null,
    },
  },

  // ── Minimums Field Definitions ──
  // Drives UI rendering. direction: 'min' = higher is safer, 'max' = lower is safer.
  MINIMUMS_FIELDS: [
    { key: 'minVis',         label: 'Min Visibility',   unit: 'SM',  direction: 'min', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'minCeil',        label: 'Min Ceiling',      unit: 'ft',  direction: 'min', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'maxXwd',         label: 'Max Crosswind',    unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'maxTotalWind',   label: 'Max Total Wind',   unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'maxGust',        label: 'Max Gusts',        unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'cautionDA',      label: 'DA Caution',       unit: 'ft',  direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'noGoDA',         label: 'DA No-Go',         unit: 'ft',  direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo'] },
    { key: 'maxPressureAlt', label: 'Max Pressure Alt', unit: 'ft',  direction: 'max', modes: ['vfr_night','ifr'] },
  ],

  // ── Timezone Abbreviations ──
  TZ_ABBRS: {
    'America/New_York':    'ET',
    'America/Chicago':     'CT',
    'America/Denver':      'MT',
    'America/Phoenix':     'MST',
    'America/Los_Angeles': 'PT',
    'America/Anchorage':   'AKT',
    'America/Adak':        'HAT',
    'Pacific/Honolulu':    'HT',
    'America/Halifax':     'AT',
    'America/Toronto':     'ET',
    'America/Vancouver':   'PT',
  },

  // ── Known Limitations ──
  LIMITATIONS: [
    {
      category: 'Not Yet Implemented',
      severity: 'critical',
      items: [
        { title: 'NOTAMs and TFRs',            detail: 'Runway closures, navaid outages, approach procedure changes, and active Temporary Flight Restrictions are not shown. FAA NOTAM API integration is pending. Always check NOTAMs via 1800wxbrief.com, ForeFlight, or the FAA NOTAM search before every flight.' },
        { title: 'Approach Minimums',          detail: 'The tool flags IFR flight category but does not know specific approach minimums for a given procedure. A runway with only a VOR approach has different minimums than one with an ILS. Verify approach minimums from current approach plates.' },
        { title: 'Alternate Airport Weather',  detail: 'The tool flags whether a FAR 91.169 alternate is required, but does not check weather at a proposed alternate. Identify and verify a qualifying alternate separately.' },
        { title: 'Weight & Balance / Performance', detail: 'No W&B calculation, takeoff/landing distance check, fuel planning, or engine-out analysis. These are pending in the next build phase. Use your aircraft POH and an approved W&B worksheet before every flight.' },
      ],
    },
    {
      category: 'Geographic Limitations',
      severity: 'warn',
      items: [
        { title: 'Continental US Only',  detail: 'Winds aloft, G-AIRMETs, and hemispheric rule checks only cover CONUS. Routes to Canada, Alaska, Hawaii, or the Caribbean receive valid METARs/TAFs but degraded or incorrect route intelligence. No warning is shown when a route exits CONUS.' },
        { title: 'Magnetic Variation',   detail: 'The hemispheric rule check uses geodetic (true) bearing. FAR 91.159 specifies magnetic course. At KMRB variation is approximately 10°W. Routes with a true course near 080°–090° or 170°–180° should be verified on the sectional chart.' },
      ],
    },
    {
      category: 'Altitude Limitations',
      severity: 'warn',
      items: [
        { title: 'Winds Aloft Above 18,000ft',         detail: 'The winds aloft query uses level=low which covers 3,000–18,000ft only. IFR flights at FL200 and above receive no wind data. The cruise altitude input is capped at 17,500ft for VFR.' },
        { title: 'Density Altitude Thresholds',        detail: 'Caution and no-go density altitude thresholds are set in instructor minimums and are not yet aircraft-specific. Aircraft-specific DA limits will be added with the aircraft profile feature.' },
      ],
    },
    {
      category: 'Terrain',
      severity: 'warn',
      items: [
        { title: 'Terrain Warnings Are Approximate', detail: 'Terrain alerts are based on named mountain region bounding areas. Actual ground elevation along the route is not computed. MEF values from sectional charts are not integrated. Always check sectional MEFs for the planned route.' },
        { title: 'No Obstacle Data',                 detail: 'Towers, powerlines, and man-made obstacles are not checked. Particularly relevant at low altitudes during departure and approach.' },
      ],
    },
    {
      category: 'Forecast Currency',
      severity: 'info',
      items: [
        { title: 'Winds Aloft Validity Window', detail: 'The fcst=06 winds aloft data is valid FOR USE 0800–1500Z. Outside that window, data is from the prior forecast cycle. No warning is displayed when outside the valid window.' },
        { title: 'Advisory Cache TTLs',         detail: 'G-AIRMETs are cached 15 minutes, SIGMETs 10 minutes, PIREPs 5 minutes. An advisory issued immediately after a cache refresh will not appear until the TTL expires. In rapidly developing convective situations, re-request the briefing.' },
      ],
    },
    {
      category: 'General',
      severity: 'info',
      items: [
        { title: 'This Tool Does Not Replace an Official Briefing', detail: 'This tool is a structured planning aid. It does not constitute an official FAA weather briefing. Always obtain a full standard briefing from 1800wxbrief.com, ForeFlight, or a certificated FSS before flight.' },
        { title: 'Airports Without METAR Stations',                detail: 'If a departure or arrival airport has no METAR station, the briefing will fail with an API error. Uncontrolled airstrips and backcountry airports often lack weather reporting.' },
      ],
    },
  ],

};
