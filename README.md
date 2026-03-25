# Central Aviation Preflight

A preflight planning and documentation platform for Part 61 flight training operations. Built for a single-CFI operation at KMRB (Eastern WV Regional), deployable to any small flight school or independent instructor.

https://aconway01.github.io/preflight/preflight.html

---

## Overview

Central Aviation Preflight generates a complete, documented weather brief enforcing a three-tier minimums hierarchy — FAA regulatory floors, instructor/school minimums, and personal minimums — with hard blocking that prevents personal minimums from being set below instructor floors. It supports VFR, IFR, and Student Solo flight rules modes with automatic day/night minimums switching per station based on calculated sunrise/sunset.

The output is a printable PDF and downloadable text report suitable for CFI sign-off documentation and student logbook reference.

---

## Features

### Weather Package
- METARs and TAFs via AVWX (token-authenticated, server-side to protect credentials)
- G-AIRMETs, SIGMETs, Convective SIGMETs, PIREPs via Aviation Weather Center
- Winds aloft with dynamic NWS FD forecast cycle selection (24Z/06Z/12Z/18Z)
- Sunrise/sunset calculated per station using NOAA solar algorithm
- Density altitude with humidity correction
- IFR alternate requirement check (FAR 91.169)
- CONUS boundary detection with degraded-coverage warning
- Automatic night/day threshold selection per station

### Minimums Enforcement
- **Three-tier hierarchy:** FAA legal floors → instructor/school minimums → personal minimums
- Hard blocking prevents personal minimums below instructor floor
- Per-mode configuration: VFR Day, VFR Night, IFR, Solo Day, Solo Night
- Fields: min visibility, min ceiling, max crosswind, max total wind, max gust, DA caution/no-go, max pressure altitude
- FAR 91.211 O₂ requirement checks at 12,500ft / 14,000ft / 15,000ft
- Regulatory reference panel with tooltip annotations on all fields
- All minimums for all relevant modes recorded in the text report regardless of active tab

### Route Intelligence
- Hemispheric rule check (FAR 91.159)
- Washington DC SFRA / FRZ proximity with inside-airspace detection
- Permanent SFRA and prohibited area proximity checks (P-40, P-56, Camp David, etc.)
- Terrain and mountain area awareness
- Convective SIGMET active on route → hard NO-GO at trip and leg level
- Active SIGMET on route → GO WITH CAUTION minimum

### Flight Identity
- Multi-leg route planning with departure times and flight times
- VFR / IFR / VFR — Student Solo flight rules modes
- PIC and dynamic occupant slots with role selector and certificate number fields
- CFI sign-off toggle for solo flight documentation

### Pilot Readiness
- IMSAFE checklist (Illness, Medication, Stress, Alcohol, Fatigue, Emotion)
- Currency check: day/night landings, IFR approaches, flight review — filtered by flight rules mode
- Student solo endorsement (FAR 61.87) and night solo endorsement (FAR 61.93) currency items

### Output
- PDF via browser print — all panels forced open, interactive controls hidden
- Named text export (`CA-Preflight-KDEP-KARR-YYYY-MM-DD.txt`)
- Logbook summary block with per-leg estimated times and total flight time
- Complete personal minimums for all relevant modes in every report

---

## Architecture

| Layer | Technology |
|---|---|
| Frontend | Single-file HTML/CSS/JS — no build step, no dependencies |
| Backend | Google Apps Script (`Code.gs`) — weather API proxy, server-side token management |
| Data | `data.js` — aircraft profiles, minimums hierarchy, limitations, timezone config |
| Hosting | GitHub Pages (frontend) + Google Apps Script web app (backend) |

The backend runs as a Google Apps Script web app, protecting the AVWX API token from client exposure and aggregating all weather API calls (AVWX, Aviation Weather Center) into a single response. CacheService reduces redundant API calls within TTL windows.

---

## Repository Structure

```
preflight.html    — Complete frontend application (single file)
Code.gs           — Google Apps Script backend
data.js           — School/instructor/personal minimums, aircraft config, limitations
Logo.png          — Must be in same directory as preflight.html
```

---

## Setup

### Backend (Google Apps Script)

1. Create a new Google Apps Script project at [script.google.com](https://script.google.com)
2. Paste `Code.gs` content into the editor
3. Set your AVWX token in `CONFIG.avwxToken`
4. Configure your home airports in `CONFIG.stations` with runway headings and elevation
5. Deploy as a web app — **Execute as: Me**, **Who has access: Anyone**
6. Copy the deployment URL

### Frontend (GitHub Pages)

1. Fork or clone this repository
2. In `preflight.html`, update the Apps Script URL in the `fetchBrief()` function
3. Push to GitHub and enable GitHub Pages on the main branch
4. `Logo.png` and `data.js` must be in the same directory as `preflight.html`

### Minimums Configuration (`data.js`)

The minimums hierarchy is configured in `data.js`:

```js
SCHOOL: {
  general: { vfr_day: { minVis: 3, minCeil: 1500, ... }, ... },
  student: { vfr_day: { minVis: 5, minCeil: 2500, ... }, ... },
}

INSTRUCTORS: [
  {
    name: 'Andy Conway',
    general:  { vfr_day: { minVis: 5, minCeil: 2500, ... }, ... },
    student:  { vfr_day: { minVis: 5, minCeil: 3000, ... }, ... },
  }
]
```

Personal minimums are set in the app UI and stored in the browser session. They are saved to the text and PDF reports for documentation.

---

## Known Limitations

| Item | Status |
|---|---|
| NOTAMs / TFRs | Pending FAA API key — always check via 1800wxbrief.com |
| Approach minimums | IFR procedures not included — verify from current plates |
| Alternate weather | Alternate requirement flagged; alternate weather not fetched |
| W&B / Performance | Phase 3 — not yet implemented |
| Icing / freezing level | PIREPs surfaced; dedicated analysis not yet implemented |
| Winds aloft | 3,000–18,000ft only (`level=low`) |
| G-AIRMET field mapping | Unverified against live data — run `debugGairmetFields()` when advisories are active |
| International routes | CONUS only for winds aloft and G-AIRMETs; METARs/TAFs still valid |

This tool does not replace an official weather briefing. Always obtain a standard weather briefing from 1800wxbrief.com, ForeFlight, or another FAA-approved source before every flight.

---

## Debug Functions (Code.gs)

Run these in the Apps Script editor to diagnose data issues:

| Function | Purpose |
|---|---|
| `debugMetarFields()` | Log raw AVWX METAR structure for KMRB and KJFK |
| `debugTafFields()` | Log raw AVWX TAF structure |
| `debugWindsAloft()` | Test FD wind fetch and station parsing for KMRB and KIAD |
| `debugGairmetFields()` | Log G-AIRMET structure when advisories are active |
| `debugSigmetFields()` | Log SIGMET structure |
| `debugPirepFields()` | Log PIREP structure |
| `debugStationRunways(id)` | Log runway headings from AVWX for any station |
| `debugDensityAltitudeForStation(id, elev)` | Test DA calculation |
| `debugTafAtTime(id, isoTime)` | Test TAF period selection for a given time |

---

## Roadmap

**Phase 3 — Aircraft & Performance** *(not started)*
- Weight and balance from aircraft profile
- Takeoff and landing distance per runway
- Fuel burn and reserve calculations
- AROW document check

**Platform Migration** *(future)*
- Django + PostgreSQL backend
- Multi-school, multi-instructor, multi-aircraft support
- Student dispatch workflow with CFI approval
- Logbook integration

---

## API Dependencies

| Service | Usage | Auth |
|---|---|---|
| [AVWX](https://avwx.rest) | METARs, TAFs, station info | Bearer token (server-side) |
| [Aviation Weather Center](https://aviationweather.gov/api) | G-AIRMETs, SIGMETs, PIREPs, winds aloft | None (public) |

AVWX free tier supports approximately 1,000 requests/day. Each brief uses ~4 AVWX calls. CacheService reduces redundant calls within 20-minute TTL windows.

---

## Regulatory References

- FAR 61.56 — Flight review
- FAR 61.57 — Recent flight experience (day/night currency)
- FAR 61.87 — Student solo endorsement
- FAR 61.89 — General limitations on student pilots
- FAR 61.93 — Night solo cross-country endorsement
- FAR 91.119 — Minimum safe altitudes
- FAR 91.155 — VFR weather minimums
- FAR 91.159 — VFR cruising altitude (hemispheric rule)
- FAR 91.169 — IFR alternate requirements
- FAR 91.211 — Supplemental oxygen requirements
- 14 CFR Part 93 — Special use airspace (DC SFRA, FRZ)

---

*Central Aviation — KMRB, Martinsburg WV*
