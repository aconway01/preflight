# Central Aviation Preflight

A preflight planning and decision-support tool for pilots —
students, CFIs, flight schools, and recreational pilots.
No backend infrastructure required beyond a free Google
Apps Script account.

**https://aconway01.github.io/preflight/**

> **Decision-support tool only.** This application does
> not constitute an official FAA weather check and makes
> no determination about the safety or advisability of
> any flight. The Pilot in Command bears sole
> responsibility for the safety of the flight under
> FAR 91.3. Always obtain a standard weather check from
> 1800wxbrief.com, ForeFlight, or a certificated FSS
> before flight.

---

## Overview

Central Aviation Preflight generates a documented
Preflight Summary enforcing a three-tier minimums
hierarchy — FAA regulatory floors, school/instructor
minimums, and personal minimums. It supports VFR, IFR,
and Student Solo flight rules modes with automatic
day/night condition derivation per station based on
the NOAA solar algorithm.

Output is a printable PDF and downloadable text report.
A required acknowledgement confirms PIC responsibility
(FAR 91.3) before every Preflight Check.

---

## Features

### Route Planning
- Multi-leg routing with intermediate stops and waypoints
- Depart/Arrive guided entry or full route string input
  (e.g. `KIAD MAPAX KOKV KFDK KIAD` — waypoints included)
- Vertical route schematic with inline stop/waypoint editor
- Auto-normalization of 3-letter identifiers to ICAO format

### Weather Package
- METARs and TAFs via AVWX (station name, elevation, and
  runway headings sourced live — no hardcoded airport data)
- G-AIRMETs (SIERRA/TANGO/ZULU), SIGMETs, Convective
  SIGMETs, PIREPs via Aviation Weather Center
- Winds aloft with dynamic NWS FD forecast cycle selection,
  interpolation at cruise altitude, headwind/tailwind
  component, and freezing level
- Sunrise/sunset per station using NOAA solar algorithm —
  automatic day/night condition derivation
- Density altitude with humidity correction (Buck equation)
- IFR alternate requirement check (FAR 91.169)
- CONUS boundary detection with route intelligence warning
- AWOS-1/AWOS-2 capability flagging

### Minimums Enforcement
- Three-tier hierarchy: FAA floors → school/instructor →
  personal minimums
- School/instructor minimums toggleable; FAA floor always
  enforced
- Personal minimums hard-blocked below active floor
- Per-mode: VFR Day, VFR Night, IFR, Solo Day, Solo Night
- Fields: min visibility, min ceiling, max crosswind, max
  total wind, max gust, density altitude caution/limit,
  max pressure altitude
- FAR 91.211 oxygen requirement checks
- Session-only — not persisted

### Route Intelligence
- Hemispheric rule check (FAR 91.159)
- Washington DC SFRA/FRZ proximity and inside-airspace
  detection
- Permanent SFRA and prohibited area proximity
- Terrain and mountain area awareness (Appalachians,
  Rockies, Sierra Nevada, Cascades)
- Convective SIGMET on route → Below Minimums verdict
- CONUS boundary detection

### Pilot Readiness
- IMSAFE self-assessment — Yes/No per question with
  optional notes. Documented in output, never a gate.
- Currency: day/night landings, IFR approaches, holds,
  flight review — filtered by flight rules mode
- FAR references on all currency fields
- Solo endorsement fields (FAR 61.87 / FAR 61.93)

### Guided Walkthrough
- Optional section-by-section walkthrough of the
  Preflight Summary
- Plain-language canned explanations keyed to condition
  states — deterministic, no AI generation
- Spotlight overlay with smooth scroll transitions
- Contents jump panel for non-linear navigation
- Resumes from last position if exited and re-entered

### Output & EFB Integration
- PDF via browser print —
  `YYYY-MM-DD-CAPreflight-DEP-ARR.pdf`
- Text report download —
  `YYYY-MM-DD-CAPreflight-DEP-ARR.txt`
- Optional PIC, CFI, and student sign-off blocks in PDF
- → ForeFlight (iOS URL scheme)
- → Garmin Pilot (DCT route string to clipboard)
- → FltPlan (DCT route string to clipboard)
- Copy Route (catch-all clipboard)
- Save-before-EFB prompt

### Liability & Compliance
- Required PIC acknowledgement (FAR 91.3) before every
  Preflight Check
- Terminology: "Within Minimums" / "Marginal" /
  "Below Minimums" / "Not Legal" — never go/no-go
- No red color on verdicts — red reserved for hazard
  callouts only (convective SIGMETs, terrain)
- FAR 91.3 disclaimer on every PDF page
- PIC name and acknowledgement timestamp in every output

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS |
| Backend | Google Apps Script (`Code.gs`) |
| Data | `src/data/config.js` (ES module) |
| Hosting | GitHub Pages (`gh-pages` branch) |

The backend runs as a Google Apps Script web app,
protecting the AVWX API token and aggregating all
weather API calls into a single response. CacheService
reduces redundant API calls within TTL windows.

---

## Repository Structure

```
src/                          — React application source
  components/
    intent/                   — Intent moment components
    review/                   — Review moment (ReviewMoment.jsx)
    dispatch/                 — Dispatch moment
    shared/                   — Shared components
  data/
    config.js                 — CA_DATA (minimums, limitations)
    walkthroughStrings.js     — Walkthrough canned string library
  utils/
    buildSteps.js             — Walkthrough step sequence builder
    buildPreflightUrl.js      — API URL construction
    solar.js                  — NOAA solar algorithm
Code.gs                       — Google Apps Script backend
public/                       — Static assets
  manifest.json               — PWA manifest
  ca_favicon_package/         — Favicon assets
  LogoTransparent.png         — App logo
preflight.html                — Legacy app (archived)
data.js                       — Legacy data file (archived)
```

---

## Setup

### Backend (Google Apps Script)

1. Create a new project at [script.google.com](https://script.google.com)
2. Paste `Code.gs` content into the editor
3. Set your AVWX API token in `CONFIG.avwxToken`
4. Deploy as a web app — **Execute as: Me**,
   **Who has access: Anyone**
5. Copy the deployment URL into
   `src/data/config.js` → `CA_DATA.APPS_SCRIPT_URL`

### Frontend (GitHub Pages)

```bash
npm install
npm run dev        # development server
npm run build      # production build
npm run deploy     # build and deploy to GitHub Pages
```

### Minimums Configuration

Default minimums are set in `src/data/config.js` in the
`CA_DATA.SCHOOL` and `CA_DATA.INSTRUCTORS` blocks.
These populate the school/instructor tier on first load.
Pilots adjust from there in the UI — minimums are
session-only and not persisted.

### AVWX API Usage

Each single-leg Preflight Check consumes **4 AVWX calls**
(1 METAR + 1 TAF per station). Multi-leg checks use 2
calls per unique airport. All other data (winds aloft,
G-AIRMETs, SIGMETs, PIREPs) uses the public Aviation
Weather Center API with no authentication.

AVWX free tier: **100 calls/day**. First paid tier:
$9/month for 1,000 calls/day.

---

## Known Limitations

| Item | Status |
|---|---|
| NOTAMs / TFRs | NMS-API integration planned — always check via 1800wxbrief.com |
| Approach minimums | IFR procedure-specific minimums not included — verify from current plates |
| Alternate weather | Alternate requirement flagged; weather not fetched |
| W&B / Performance | Phase 3 — not yet implemented |
| Terrain model | Named region bounding boxes only — actual terrain profile not computed |
| International routes | CONUS only for winds aloft and G-AIRMETs |
| Minimums persistence | Session-only — reset on page reload |

---

## Roadmap

**Phase 3 — Aircraft & Performance**
- Weight and balance from aircraft profile
- Takeoff and landing distance
- Fuel burn and reserves
- Aircraft-specific performance limits

**Platform Migration (future)**
- Django + PostgreSQL backend
- Multi-school, multi-instructor, multi-aircraft
- Student dispatch workflow with CFI approval
- Logbook integration
- Persisted minimums and preferences
- Compliance framework

---

## Debug Functions (Code.gs)

| Function | Purpose |
|---|---|
| `debugMetarFields()` | Raw AVWX METAR structure |
| `debugTafFields()` | Raw AVWX TAF structure |
| `debugWindsAloft()` | FD wind fetch and station parsing |
| `debugGairmetFields()` | G-AIRMET structure |
| `debugSigmetFields()` | SIGMET structure |
| `debugPirepFields()` | PIREP structure |
| `debugStationRunways(id)` | Live runway headings |
| `debugDensityAltitudeForStation(id)` | DA calculation |
| `debugTafAtTime(id, isoTime)` | TAF period selection |

---

## API Dependencies

| Service | Usage | Auth |
|---|---|---|
| [AVWX](https://avwx.rest) | METARs, TAFs, station info | Bearer token (server-side) |
| [Aviation Weather Center](https://aviationweather.gov/api) | G-AIRMETs, SIGMETs, PIREPs, winds aloft | None (public) |

---

## Regulatory References

- FAR 61.56 — Flight review
- FAR 61.57 — Recent flight experience
- FAR 61.87 — Student solo endorsement
- FAR 61.89 — General limitations on student pilots
- FAR 61.93 — Night solo cross-country endorsement
- FAR 91.3 — Pilot in Command responsibility
- FAR 91.119 — Minimum safe altitudes
- FAR 91.155 — VFR weather minimums
- FAR 91.159 — VFR cruising altitude (hemispheric rule)
- FAR 91.169 — IFR alternate requirements
- FAR 91.211 — Supplemental oxygen requirements
- 14 CFR Part 93 — Special use airspace (DC SFRA, FRZ)
