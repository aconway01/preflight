// ============================================================
// Central Aviation — Preflight
// data.js — Frontend reference data
//
// All static reference data for the preflight tool lives here.
// Update this file as the tool evolves without touching preflight.html.
// Must be in the same directory as preflight.html.
// ============================================================

const CA_DATA = {

  // ── Apps Script URL ──
  // Update this whenever a new version is deployed to Apps Script.
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbyRVu18oSRhNup9-jjDKYc3uuH5mW8j-lTv6-4s38KOUsWfOqDSzajmvgxuRcpQ20bB/exec',

  // ── Personal Minimums Defaults ──
  // These are the default values loaded into the minimums fields.
  // They can be overridden by the pilot in the UI.
  DEFAULT_MINS: { minVis: 5,  minCeil: 2500, maxXwd: 12, maxGust: 18, cautionDA: 3000, noGoDA: 5000 },
  IFR_MINS:     { minVis: 1,  minCeil: 200,  maxXwd: 12, maxGust: 18, cautionDA: 3000, noGoDA: 5000 },
  // FAR 61.89 student solo minimums — 3SM visibility, 1,000ft ceiling (enforced as floor)
  SOLO_MINS:    { minVis: 3,  minCeil: 1000, maxXwd: 12, maxGust: 18, cautionDA: 3000, noGoDA: 5000 },

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
  // Displayed in the Limitations panel in the UI and included in saved reports.
  // Update this list as the tool evolves.
  LIMITATIONS: [
    {
      category: 'Not Yet Implemented',
      severity: 'critical',
      items: [
        {
          title: 'NOTAMs and TFRs',
          detail: 'Runway closures, navaid outages, approach procedure changes, and active Temporary Flight Restrictions are not shown. FAA NOTAM API integration is pending. Always check NOTAMs via 1800wxbrief.com, ForeFlight, or the FAA NOTAM search before every flight.',
        },
        {
          title: 'Approach Minimums',
          detail: 'The tool flags IFR flight category but does not know specific approach minimums for a given procedure. A runway with only a VOR approach has different minimums than one with an ILS. Verify approach minimums from current approach plates.',
        },
        {
          title: 'Alternate Airport Weather',
          detail: 'The tool flags whether a FAR 91.169 alternate is required, but does not check weather at a proposed alternate. Identify and verify a qualifying alternate separately.',
        },
        {
          title: 'Weight & Balance / Performance',
          detail: 'No W&B calculation, takeoff/landing distance check, fuel planning, or engine-out analysis. These are pending in the next build phase. Use your aircraft POH and an approved W&B worksheet before every flight.',
        },
      ],
    },
    {
      category: 'Geographic Limitations',
      severity: 'warn',
      items: [
        {
          title: 'Continental US Only',
          detail: 'Winds aloft, G-AIRMETs, and hemispheric rule checks only cover CONUS. Routes to Canada, Alaska, Hawaii, or the Caribbean receive valid METARs/TAFs but degraded or incorrect route intelligence. No warning is shown when a route exits CONUS.',
        },
        {
          title: 'Magnetic Variation',
          detail: 'The hemispheric rule check uses geodetic (true) bearing. FAR 91.159 specifies magnetic course. At KMRB variation is approximately 10°W. Routes with a true course near 080°–090° or 170°–180° should be verified on the sectional chart.',
        },
      ],
    },
    {
      category: 'Altitude Limitations',
      severity: 'warn',
      items: [
        {
          title: 'Winds Aloft Above 18,000ft',
          detail: 'The winds aloft query uses level=low which covers 3,000–18,000ft only. IFR flights at FL200 and above receive no wind data. The cruise altitude input is capped at 17,500ft for VFR.',
        },
        {
          title: 'Density Altitude Thresholds Are Generic',
          detail: 'Caution (3,000ft) and no-go (5,000ft) density altitude thresholds are fixed and not aircraft-specific. A turbocharged aircraft has a different performance profile than a normally aspirated one. The DA margin above field elevation is shown for context.',
        },
      ],
    },
    {
      category: 'Terrain',
      severity: 'warn',
      items: [
        {
          title: 'Terrain Warnings Are Approximate',
          detail: 'Terrain alerts are based on named mountain region bounding areas. Actual ground elevation along the route is not computed. MEF (Maximum Elevation Figure) values from sectional charts are not integrated. Always check sectional MEFs for the planned route.',
        },
        {
          title: 'No Obstacle Data',
          detail: 'Towers, powerlines, and man-made obstacles are not checked. Particularly relevant at low altitudes during departure and approach.',
        },
      ],
    },
    {
      category: 'Forecast Currency',
      severity: 'info',
      items: [
        {
          title: 'Winds Aloft Validity Window',
          detail: 'The fcst=06 winds aloft data is valid FOR USE 0800–1500Z. Outside that window, data is from the prior forecast cycle. No warning is displayed when outside the valid window.',
        },
        {
          title: 'Advisory Cache TTLs',
          detail: 'G-AIRMETs are cached 15 minutes, SIGMETs 10 minutes, PIREPs 5 minutes. An advisory issued immediately after a cache refresh will not appear until the TTL expires. In rapidly developing convective situations, re-request the briefing.',
        },
      ],
    },
    {
      category: 'General',
      severity: 'info',
      items: [
        {
          title: 'This Tool Does Not Replace an Official Briefing',
          detail: 'This tool is a structured planning aid. It does not constitute an official FAA weather briefing. Always obtain a full standard briefing from 1800wxbrief.com, ForeFlight, or a certificated FSS before flight.',
        },
        {
          title: 'Airports Without METAR Stations',
          detail: 'If a departure or arrival airport has no METAR station, the briefing will fail with an API error. Uncontrolled airstrips and backcountry airports often lack weather reporting.',
        },
      ],
    },
  ],

};
