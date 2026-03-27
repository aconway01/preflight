// ============================================================
// Preflight — Frontend reference data
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
//
// Solo modes are split into solo_day and solo_night.
// Night solo requires a separate FAR 61.93 endorsement.
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
      maxPressureAlt: 12500, // ft MSL — O2 caution threshold (FAR 91.211(a)(1)); hard limit 14,000ft
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
    solo_day: {
      minVis:         3,     // SM — FAR 61.89(a)(6)
      minCeil:        1000,  // ft AGL — FAR 61.89(a)(6)
      maxXwd:         null,
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: null,
    },
    solo_night: {
      minVis:         3,     // SM — FAR 61.89(a)(6) applies at night too
      minCeil:        1000,  // ft AGL — FAR 61.89(a)(6)
      maxXwd:         null,
      maxTotalWind:   null,
      maxGust:        null,
      cautionDA:      null,
      noGoDA:         null,
      maxPressureAlt: 12500, // O2 caution applies at night — FAR 91.211
    },
  },

  // ── School Configuration ──
  SCHOOL: {
    
    

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
      solo_day: {
        minVis:         5,
        minCeil:        3000,
        maxXwd:         10,
        maxTotalWind:   15,
        maxGust:        15,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: null,
      },
      solo_night: {
        minVis:         5,
        minCeil:        3000,
        maxXwd:         10,
        maxTotalWind:   15,
        maxGust:        15,
        cautionDA:      3000,
        noGoDA:         5000,
        maxPressureAlt: 12500,
      },
    },

    aircraft_minimums:         {},
    student_minimums:          {},
    student_aircraft_minimums: {},
  },

  // ── Instructors ──
  INSTRUCTORS: [
    {
      
      name: '',
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
        solo_day: {
          minVis:         5,
          minCeil:        3000,
          maxXwd:         10,
          maxTotalWind:   15,
          maxGust:        15,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: null,
        },
        solo_night: {
          minVis:         5,
          minCeil:        3000,
          maxXwd:         10,
          maxTotalWind:   15,
          maxGust:        15,
          cautionDA:      3000,
          noGoDA:         5000,
          maxPressureAlt: 12500,
        },
      },

      aircraft_minimums:         {},
      student_minimums:          {},
      student_aircraft_minimums: {},
    },
  ],

  // ── Default Personal Minimums ──
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
    solo_day: {
      minVis:         5,
      minCeil:        3000,
      maxXwd:         10,
      maxTotalWind:   15,
      maxGust:        15,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: null,
    },
    solo_night: {
      minVis:         5,
      minCeil:        3000,
      maxXwd:         10,
      maxTotalWind:   15,
      maxGust:        15,
      cautionDA:      3000,
      noGoDA:         5000,
      maxPressureAlt: 12500,
    },
  },

  // ── Minimums Field Definitions ──
  MINIMUMS_FIELDS: [
    { key: 'minVis',         label: 'Min Visibility',   unit: 'SM',  direction: 'min', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'FAR 91.155 — 3SM minimum for Class B/C/D/E. Class G day: 1SM below 1,200ft AGL.' },
    { key: 'minCeil',        label: 'Min Ceiling',      unit: 'ft',  direction: 'min', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'Derived from FAR 91.155 cloud clearance rules (1,000ft above / 500ft below / 2,000ft horizontal). No explicit FAR ceiling floor for VFR.' },
    { key: 'maxXwd',         label: 'Max Crosswind',    unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'No FAR limit. School/instructor policy below POH demonstrated crosswind component.' },
    { key: 'maxTotalWind',   label: 'Max Total Wind',   unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'No FAR limit. School/instructor policy. Combined headwind + crosswind envelope.' },
    { key: 'maxGust',        label: 'Max Gusts',        unit: 'kts', direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'No FAR limit. School/instructor policy. Gust factor affects control authority during landing flare.' },
    { key: 'cautionDA',      label: 'DA Caution',       unit: 'ft',  direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'No FAR-mandated VFR DA limit. School policy. High DA degrades climb, extends takeoff roll, reduces service ceiling.' },
    { key: 'noGoDA',         label: 'DA No-Go',         unit: 'ft',  direction: 'max', modes: ['vfr_day','vfr_night','ifr','solo_day','solo_night'], tip: 'No FAR-mandated VFR DA limit. School policy hard stop above this density altitude.' },
    { key: 'maxPressureAlt', label: 'Max Pressure Alt', unit: 'ft',  direction: 'max', modes: ['vfr_night','ifr','solo_night'],                      tip: 'FAR 91.211 — O₂ required: crew >12,500ft MSL for >30min; crew >14,000ft always; all occupants >15,000ft. Uses pressure altitude.' },
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
        { title: 'NOTAMs and TFRs',            detail: 'Runway closures, navaid outage, approach procedure changes, and active Temporary Flight Restrictions are not shown. FAA NOTAM API integration is pending. Always check NOTAMs via 1800wxbrief.com, ForeFlight, or the FAA NOTAM search before every flight.' },
        { title: 'Approach Minimums',          detail: 'The tool flags IFR flight category but does not know specific approach minimums for a given procedure. A runway with only a VOR approach has different minimums than one with an ILS. Verify approach minimums from current approach plates.' },
        { title: 'Alternate Airport Weather',  detail: 'The tool flags whether a FAR 91.169 alternate is required, but does not check weather at a proposed alternate. Identify and verify a qualifying alternate separately.' },
        { title: 'Weight & Balance / Performance', detail: 'No W&B calculation, takeoff/landing distance check, fuel planning, or engine-out analysis. These are pending in the next build phase. Use your aircraft POH and an approved W&B worksheet before every flight.' },
      ],
    },
    {
      category: 'Geographic Limitations',
      severity: 'warn',
      items: [
        { title: 'Continental US Only',  detail: 'Winds aloft, G-AIRMETs, and hemispheric rule checks only cover CONUS. Routes to Canada, Alaska, Hawaii, or the Caribbean receive valid METARs/TAFs but degraded or incorrect route intelligence. A warning is shown when a route exits CONUS, but no supplemental international data is provided.' },
        { title: 'Magnetic Variation',   detail: 'The hemispheric rule check uses geodetic (true) bearing. FAR 91.159 specifies magnetic course. Magnetic variation ranges from approximately 5°W to 20°W across the contiguous US. Routes with a true course near 080°–090° or 170°–180° should be verified on the sectional chart.' },
      ],
    },
    {
      category: 'Altitude Limitations',
      severity: 'warn',
      items: [
        { title: 'Winds Aloft Above 18,000ft',  detail: 'For IFR flights with cruise altitude above 18,000ft, the tool requests level=mid data (up to FL390) if the nearest FD station supports it. For VFR flights the cruise altitude input is capped at 17,500ft and level=low is always used. Mid-level data availability varies by station.' },
        { title: 'Density Altitude Thresholds', detail: 'Caution and below-minimums density altitude thresholds are set in instructor minimums and are not yet aircraft-specific. Aircraft-specific DA limits will be added with the aircraft profile feature in a future phase.' },
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
        { title: 'Winds Aloft Validity Window', detail: 'The tool dynamically selects the appropriate NWS FD forecast cycle (24Z, 06Z, 12Z, or 18Z) based on the current UTC time and caches results for 20 minutes. The active cycle is shown next to the winds aloft station label. During a cycle transition the displayed data may be up to 20 minutes old.' },
        { title: 'Advisory Cache TTLs',         detail: 'G-AIRMETs are cached 15 minutes, SIGMETs 10 minutes, PIREPs 5 minutes. An advisory issued immediately after a cache refresh will not appear until the TTL expires. In rapidly developing convective situations, re-request the briefing to force a cache refresh.' },
        { title: 'Day/Night Minimums Auto-Detection', detail: 'Night minimums are applied per station based on calculated sunrise/sunset at the station location. A flight that departs in daylight but arrives after sunset will automatically use night minimums for the arrival analysis. All minimums for all relevant modes are recorded in the text report regardless of which tab is active.' },
        { title: 'Wind-Adjusted Flight Time Estimate', detail: 'The wind-adjusted time in the logbook summary uses a TAS proxy derived from your entered flight time and route distance (TAS = distance ÷ entered hours). If your entered time already incorporates a wind correction, the adjustment may double-count the wind effect. The figure is labelled as an estimate and should not replace proper flight planning.' },
        { title: 'Runway Data Currency', detail: 'Runway headings are sourced live from the AVWX station database and reflect current FAA designations. However AVWX may not reflect the absolute latest FAA changes immediately after a redesignation. Always verify runway identifiers from current charts before flight.' },
      ],
    },
    {
      category: 'General',
      severity: 'info',
      items: [
        { title: 'This Tool Does Not Replace an Official Briefing', detail: 'This tool is a structured planning aid only. It does not constitute an official FAA weather briefing and makes no go/no-go determination. The Pilot in Command bears sole responsibility for the safety of the flight under FAR 91.3. Always obtain a full standard briefing from 1800wxbrief.com, ForeFlight, or a certificated FSS before flight.' },
        { title: 'Minimums Are Session-Only',  detail: 'Instructor and personal minimums are held in memory for the current session only. They are not saved to a database. On a fresh page load the tool uses the defaults configured in data.js. Verify your minimums are correctly set before each briefing session.' },
        { title: 'Weather Data Service Availability', detail: 'The tool depends on the AVWX API for METARs and TAFs, and the Aviation Weather Center API for winds aloft, G-AIRMETs, SIGMETs, and PIREPs. If either service is unavailable or the AVWX daily call limit is reached, the briefing will fail. Use 1800wxbrief.com or ForeFlight as a backup.' },
        { title: 'Airports Without METAR Stations', detail: 'If a departure or arrival airport has no METAR station, the briefing will fail with an API error. Uncontrolled airstrips and backcountry airports often lack weather reporting. Identify the nearest reporting station and assess conditions manually.' },
      ],
    },
  ],

};
