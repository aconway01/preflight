# Central Aviation Preflight

A preflight planning and decision-support tool for Part 61 flight training operations. Designed for use by independent CFIs, small flight schools, and recreational pilots. Deployable to any operation with no backend infrastructure beyond a free Google Apps Script account.

> **Decision-support tool only.** This application does not constitute an official FAA weather briefing and makes no go/no-go determination. The Pilot in Command bears sole responsibility for the safety of the flight under FAR 91.3. Always obtain a full standard briefing from 1800wxbrief.com, ForeFlight, or a certificated FSS before flight.

---

## Overview

The tool generates a complete, documented preflight brief enforcing a three-tier minimums hierarchy — FAA regulatory floors, instructor minimums (editable inline), and personal minimums — with hard blocking that prevents personal minimums from being set below the active floor. It supports VFR, IFR, and Student Solo flight rules modes with automatic day/night minimums switching per station based on calculated sunrise/sunset.

Output is a printable PDF and downloadable text report suitable for CFI sign-off documentation and student logbook reference. A session acknowledgement requires the pilot to confirm PIC responsibility (FAR 91.3) before each brief.

---

## Features

### Weather Package
- METARs and TAFs via AVWX (`options=info` — station name, elevation, and runway headings sourced live; no hardcoded station data)
- G-AIRMETs (SIERRA/TANGO/ZULU products), SIGMETs, Convective SIGMETs, PIREPs via Aviation Weather Center
- Winds aloft with dynamic NWS FD forecast cycle selection (24Z/06Z/12Z/18Z), interpolation at exact cruise altitude, headwind/tailwind component, and freezing level from temperature profile
- Mid-level winds aloft (up to FL390) for IFR cruise above 18,000ft when station supports it
- Sunrise/sunset per station using NOAA solar algorithm — automatic day/night threshold switching
- Density altitude with virtual temperature / humidity correction (Buck equation)
- IFR alternate requirement check (FAR 91.169)
- CONUS boundary detection with route intelligence degradation warning
- Limited station detection — AWOS-1/AWOS-2 flagged when flight category is unreported

### Minimums Enforcement
- **Three-tier hierarchy:** FAA legal floors → instructor minimums (editable) → personal minimums
- Instructor minimums editable inline; FAA floor enforced — cannot be set below regulatory minimum
- Instructor minimums can be disabled (FAA floor becomes the sole constraint)
- Personal minimums hard-blocked below active instructor floor
- Per-mode: VFR Day, VFR Night, IFR, Solo Day, Solo Night
- Fields: min visibility, min ceiling, max crosswind, max total wind, max gust, DA caution/below-minimums, max pressure altitude
- FAR 91.211 O₂ requirement checks at 12,500ft / 14,000ft / 15,000ft
- Regulatory reference panel with tooltip annotations on all fields
- Minimums are session-only — not persisted to a database

### Route Intelligence
- Hemispheric rule check (FAR 91.159) — true course with magnetic variation caveat
- Washington DC SFRA / FRZ proximity with inside-airspace detection
- Permanent SFRA and prohibited area proximity (P-40, P-56, Camp David, etc.)
- Terrain and mountain area awareness (Appalachians, Rockies, Sierra Nevada, Cascades)
- Convective SIGMET on route → BELOW MINIMUMS at trip and leg level
- Active SIGMET on route → MARGINAL minimum
- CONUS exit → MARGINAL minimum
- Strong headwind at cruise (≥20kt) → concern; (≥30kt) → below minimums
- Icing concern when freezing level within 2,000ft of cruise altitude, compounded by icing PIREPs

### Flight Identity
- Multi-leg route planning with departure times and flight times
- VFR / IFR / VFR — Student Solo flight rules modes
- PIC and dynamic occupant slots with role selector and certificate number fields
- CFI and student sign-off blocks for PDF documentation (independent toggles)

### Pilot Readiness
- IMSAFE checklist (Illness, Medication, Stress, Alcohol, Fatigue, Emotion)
- Currency: day/night landings, IFR approaches, flight review — filtered by flight rules mode
- Solo endorsement (FAR 61.87) and night solo endorsement (FAR 61.93) items

### Output & EFB Integration
- PDF via browser print (`YYYY-MM-DD-CAPreflight-DEP-ARR.pdf`)
- Text report download (`YYYY-MM-DD-CAPreflight-DEP-ARR.txt`)
- Logbook summary with per-leg times and wind-adjusted total flight time estimate
- **→ ForeFlight** button — triggers `foreflightmobile://` URL scheme on iPad/iPhone
- **Copy Route** button — copies `DEP DCT ARR` string for Garmin Pilot, FltPlan.com, or any EFB
- Save-before-leaving prompt when using EFB buttons without having saved the report

### Mobile / Home Screen
- iOS Add to Home Screen banner (shown once per session on iPhone/iPad)
- `manifest.json` for Android install prompt and standalone mode
- PWA meta tags — opens full-screen without Safari chrome when added to home screen
- `apple-mobile-web-app-status-bar-style: black-translucent` for clean status bar

### Liability & Compliance
- Required acknowledgement checkbox (PIC responsibility, FAR 91.3, data staleness) before every brief
- Terminology: "Within Minimums" / "Marginal" / "Below Minimums" — not go/no-go
- Color scheme: green (within) / amber (marginal) / orange (below) — no stoplight red on verdicts
- PIC name and acknowledgement timestamp recorded in every text report
- Disclaimer on every PDF page referencing FAR 91.3 and active acknowledgement

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Single-file HTML/CSS/JS — no build step, no dependencies |
| Backend | Google Apps Script (`Code.gs`) — weather API proxy, server-side token |
| Data | `data.js` — minimums hierarchy, limitations, timezone config |
| Hosting | GitHub Pages (frontend) + Google Apps Script web app (backend) |

The backend runs as a Google Apps Script web app, protecting the AVWX API token from client exposure and aggregating all weather API calls into a single response. `CacheService` reduces redundant API calls within TTL windows.

All station data (name, elevation, runway headings) is sourced live from AVWX `metar.info` on every request. No airport data is hardcoded — FAA runway redesignations are reflected automatically.

---

## Repository Structure

```
preflight.html          — Complete frontend application
Code.gs                 — Google Apps Script backend
data.js                 — Minimums hierarchy, limitations, config
manifest.json           — PWA manifest for home screen install
ca_favicon_package/     — Favicon and apple-touch-icon assets
LogoTransparent.png     — Must be in same directory as preflight.html
```

---

## Setup

### Backend (Google Apps Script)

1. Create a new Google Apps Script project at [script.google.com](https://script.google.com)
2. Paste `Code.gs` content into the editor
3. Set your AVWX API token in `CONFIG.avwxToken`
4. Deploy as a web app — **Execute as: Me**, **Who has access: Anyone**
5. Copy the deployment URL into `data.js` → `APPS_SCRIPT_URL`

No station configuration is needed — all airport data is fetched live from AVWX.

### Frontend (GitHub Pages)

1. Fork or clone this repository
2. Ensure `manifest.json`, `data.js`, `LogoTransparent.png`, and `ca_favicon_package/` are in the same directory as `preflight.html`
3. Push to GitHub and enable GitHub Pages on the main branch

### Minimums Configuration (`data.js`)

Instructor minimums are now set in the app UI at runtime and are not persisted. The `data.js` INSTRUCTORS block contains default values that populate the instructor tier on first load:

```js
INSTRUCTORS: [
  {
    id:   '',       // not used — blank for multi-user deployment
    name: '',       // set in UI — blank default
    minimums: {
      vfr_day:   { minVis: 5, minCeil: 2500, maxXwd: 12, ... },
      vfr_night: { minVis: 5, minCeil: 3000, maxXwd: 10, ... },
      ...
    }
  }
]
```

To change the defaults that new users see, edit the `minimums` block in `data.js`. Each pilot can then adjust from there in the UI.

### AVWX API Usage

Each single-leg brief consumes **4 AVWX calls** (1 METAR + 1 TAF per station). Multi-leg briefs use 2 calls per unique airport. All other data (winds aloft, G-AIRMETs, SIGMETs, PIREPs) uses the public Aviation Weather Center API with no authentication.

AVWX free tier: **100 calls/day** — sufficient for a small group (5 pilots × 3 briefs/day = 60 calls). Upgrade to the $9/month tier (1,000 calls/day) for heavier use.

---

## Known Limitations

| Item | Status |
|---|---|
| NOTAMs / TFRs | Pending FAA API key — always check via 1800wxbrief.com |
| Approach minimums | IFR procedure-specific minimums not included — verify from current plates |
| Alternate weather | Alternate requirement flagged; alternate airport weather not fetched |
| W&B / Performance | Phase 3 — not yet implemented |
| Icing model | Freezing level derived from FD temps; icing concern flagged when FZL near cruise + icing PIREPs present. No dedicated icing model. |
| International routes | CONUS only for winds aloft and G-AIRMETs; METARs/TAFs valid worldwide |
| Minimums persistence | Session-only — reset on page reload. No database. |
| AVWX availability | Brief fails if AVWX is down or daily call limit reached |

---

## Debug Functions (Code.gs)

Run these in the Apps Script editor to diagnose data issues:

| Function | Purpose |
|---|---|
| `debugMetarFields()` | Log raw AVWX METAR structure for KIAD and KJFK |
| `debugTafFields()` | Log raw AVWX TAF structure |
| `debugWindsAloft()` | Test FD wind fetch and station parsing for KIAD and KJFK |
| `debugGairmetFields()` | Log G-AIRMET structure when advisories are active |
| `debugSigmetFields()` | Log SIGMET structure |
| `debugPirepFields()` | Log PIREP structure |
| `debugStationRunways(id)` | Log live runway headings from AVWX for any station |
| `debugDensityAltitudeForStation(id)` | Test DA calculation with humidity correction |
| `debugTafAtTime(id, isoTime)` | Test TAF period selection for a given time |

---

## Roadmap

**Phase 3 — Aircraft & Performance** *(not started)*
- Weight and balance from aircraft profile
- Takeoff and landing distance per runway
- Fuel burn and reserve calculations
- Aircraft-specific TAS for wind-adjusted time estimates
- Aircraft-specific density altitude limits

**Platform Migration** *(future)*
- Django + PostgreSQL backend
- Multi-school, multi-instructor, multi-aircraft support
- Student dispatch workflow with CFI approval
- Logbook integration
- Persisted minimums and preferences

---

## API Dependencies

| Service | Usage | Auth |
|---|---|---|
| [AVWX](https://avwx.rest) | METARs, TAFs, station info (elevation, runways, name) | Bearer token (server-side) |
| [Aviation Weather Center](https://aviationweather.gov/api) | G-AIRMETs, SIGMETs, PIREPs, winds aloft | None (public) |

---

## Regulatory References

- FAR 61.56 — Flight review
- FAR 61.57 — Recent flight experience (day/night currency)
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
