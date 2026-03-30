# Central Aviation Preflight — Design & Interaction Spec
### Redesign Brief for React/Vite Implementation

---

## 1. Product Philosophy

A preflight planning and decision-support tool for all pilots — students, CFIs, flight schools, and recreational pilots. Flexible by design: no assumptions about who is flying, who is instructing, or what workflow surrounds the tool.

The tool exists in its own right as a standalone planning aid. It is not a navigation tool. It feeds EFBs like ForeFlight and Garmin Pilot — it does not compete with them.

**Core principle:** Design for the least experienced user. If a zero-time student can use it confidently, every other pilot benefits from the same clarity.

**Legal language constraints — non-negotiable throughout the entire app:**
- No go/no-go language anywhere — not softened, not qualified, absent
- Never use the word "brief" or "briefing" — the app produces a Preflight Summary and runs a Preflight Check
- No red color on any verdict or determination — red is reserved strictly for specific hazard callouts (convective SIGMETs, terrain conditions)
- The app never implies it replaces 1800wxbrief.com or an official FSS briefing
- Verdict terminology: "Within Minimums" / "Marginal" / "Below Minimums" / "Not Legal" only

**Naming convention:**
- The action: "Run Preflight Check"
- The output document: "Preflight Summary"
- Transition language: "Your Preflight Summary is ready"
- Save action: "Save Preflight Summary"
- PDF filename format: `YYYY-MM-DD-CAPreflight-DEP-ARR.pdf`

---

## 2. Interaction Model — Three Moments

The app is organized around three moments. The pilot moves between them fluidly and can revisit at any time. These are modes, not wizard steps — the pilot is never locked into a linear sequence.

### Moment 1 — Intent
The pilot defines the flight: route, timing, mode, and relevant context. All inputs are gathered here. Nothing is fetched until the pilot explicitly commits by tapping "Run Preflight Check."

### Moment 2 — Review
The Preflight Summary builds and presents itself. The pilot reads, confirms, adjusts, and acknowledges. Output is layered — plain-language summary first, detail on demand. The pilot can return to Intent to change inputs and re-run without starting over.

### Moment 3 — Dispatch
Save, sign, send to EFB. The Preflight Summary is finalized. Optional CFI and student sign-off blocks. EFB integration.

---

## 3. The Experience Dial

One app, one version. The difference between a student's experience and a CFI's experience is pace and depth — not features or available information.

- The immersive pilot reads everything as it appears and takes their time through Review.
- The efficient pilot moves through Intent quickly, scans the summary, and is in Dispatch in under two minutes.

The dial is not a toggle or setting. It emerges naturally from use — the same way a user settles into their preferred pace in any well-designed tool. No preference screen, no mode selection.

**Design test:** At no point should any pilot feel condescended to by the presence of contextual guidance, nor should any pilot feel lost by its absence.

---

## 4. Moment 1 — Intent (Detailed)

### Entry Point — Empty State

The first screen a new user sees is an invitation, not a form.

- Dark screen, logo top-left, small and unobtrusive
- Single centered prompt: **"Where are you flying?"**
- Departure airport field, focused and ready for input
- Nothing else visible
- No instructions, no options, no fields they haven't earned yet
- The schematic diagram area exists in the layout but is empty — waiting

The app communicates its purpose by what it asks first.

### Route Building

**Input model: Hybrid**

The default path is guided and sequential. An accelerator path exists for experienced pilots who prefer to enter a full route string directly. Both paths produce identical state.

**Guided path — field sequence:**

1. Departure airport (ICAO/IATA identifier)
2. Destination airport
3. → Schematic diagram renders immediately with these two points
4. Intermediate stops (airports) — "Add a stop" affordance, clearly optional
5. Waypoints per leg — inline within each leg, "Add waypoint" affordance
6. Departure date and time

**Route string accelerator:**

A small, unobtrusive control — "Enter route string" — available after departure is entered. Tapping it reveals a single text input accepting standard route string format: `KIAD MAPAX KOKV KFDK KIAD`. The app parses this into the same guided structure. Invalid identifiers are flagged inline. The accelerator is discoverable but never the default.

**Intermediate stops vs. waypoints — treated differently:**

- *Intermediate stops* are airports where the pilot lands. They receive their own weather fetch, minimums check, and runway analysis. Each stop creates a new leg with its own altitude and departure time.
- *Waypoints* are navigation fixes (VORs, intersections, GPS fixes, visual checkpoints). They do not trigger weather fetches. They enrich the route string output to the EFB and are included in airspace proximity checks.

Both are supported. The UI distinguishes them clearly — stops show as full nodes in the schematic with weather status indicators; waypoints show as smaller intermediate points on the leg line.

### Schematic Route Diagram

Renders as soon as departure and destination are entered. Updates reactively as stops and waypoints are added.

**Visual language:**
- Airport nodes: circles with identifier label, elevation optional
- Intermediate stops: same size as departure/destination nodes
- Waypoints: smaller, filled diamonds on the leg line
- Leg lines: straight lines with heading and distance label
- In Review: nodes acquire status color (Within Minimums / Marginal / Below Minimums / Not Legal) based on Preflight Check results

**Design constraints:**
- Not a map — no terrain, no airspace boundaries, no sectional data
- Unambiguously a route confirmation tool, not a navigation tool
- Works well on mobile — touch targets sufficient, labels readable at small sizes

**Map view (secondary):**
- Available via a single tap on the schematic — "View on map"
- Uses OpenStreetMap or Mapbox with a deliberately minimal style (coastlines, state/country boundaries, airports only — nothing resembling a sectional)
- Route polyline and airport markers only
- Tap again to dismiss
- Confirmation tool only — visual framing reinforces this

### Flight Mode Selection

Appears after departure and destination are entered.

Options: **VFR / IFR / Student Solo**

No default — pilot must make an explicit selection. No inline definitions. VFR and IFR are day-one vocabulary for any pilot using this tool. "Student Solo" is unambiguous — it does not apply to a recreational pilot flying alone, and it does not require explanation.

Student Solo mode surfaces additional fields only after selection:
- Day / Night (auto-suggested based on departure time and calculated sunset, but pilot confirms)
- Solo endorsement fields (FAR 61.87 / FAR 61.93) — optional

### Cruise Altitude

Appears after flight mode is selected.

- Suggested based on mode and hemispheric rule (FAR 91.159) once route heading is known
- Labeled clearly as a suggestion: "Suggested: 3,500ft (hemispheric rule — eastbound VFR)"
- Pilot can accept or override
- IFR mode: no VFR altitude cap, mid-level winds available above 18,000ft
- VFR mode: input capped at 17,500ft

### Optional Context Fields

These fields are present but never required to proceed. They surface naturally in the flow — not buried in settings, not front-loaded before the pilot has context for why they matter.

**Occupants** — "Add occupant" affordance. Role selector (PIC, Student, Passenger, CFI). Certificate number field. No assumptions about who is aboard.

**Minimums** — "Set minimums" affordance. Three-tier hierarchy (FAA floors → instructor/school → personal). FAA floors are immutable. Instructor minimums editable inline, can be toggled off. Personal minimums hard-blocked below active floor. Session-only — not persisted. If not set, FAA floors apply.

**Pilot currency** — IMSAFE, day/night landings, IFR approaches, flight review. Optional. Surfaces in Preflight Summary if entered.

### Acknowledgement

Immediately before "Run Preflight Check" — not buried in settings, not shown on first load.

One clear moment: a checkbox with a plain-language statement.

> *"I confirm that I am the Pilot in Command and bear sole responsibility for the safety of this flight under FAR 91.3. I understand this tool is a planning aid only, does not constitute an official FAA weather briefing, and makes no determination about the safety or advisability of any flight. I will obtain a standard weather briefing from 1800wxbrief.com or a certificated FSS before flight."*

Checkbox must be actively checked — cannot proceed without it. PIC name field and timestamp recorded automatically in the Preflight Summary output.

### Fetch Trigger

"Run Preflight Check" is the single explicit trigger for all API calls. Nothing is fetched before this moment.

**What is fetched:**
- METARs and TAFs via AVWX (2 calls per unique airport — 1 METAR + 1 TAF)
- Winds aloft via AWC (public, no auth)
- G-AIRMETs, SIGMETs, Convective SIGMETs, PIREPs via AWC (public, no auth)

**Caching:**
- Session cache: if the same airports are checked again within the same session and within data TTL windows, cached results are returned — no new API calls
- G-AIRMETs: 15 min TTL; SIGMETs: 10 min; PIREPs: 5 min; Winds aloft: 20 min
- Cache is never silent about staleness — if cached data is used, the age of the data is shown in the relevant section

**API call conservation:**
- Speculative or background fetching: none
- Fetching on keystroke or field change: none
- Calls are batched — all airports in a single request to the Apps Script backend
- Multi-leg routes deduplicate airports that appear more than once

**Call count:** Not surfaced to the user. API conservation is an architectural concern, not a pilot concern.

---

## 5. Moment 2 — Review (Detailed)

### Transition

After "Run Preflight Check" is tapped:
- Loading state: clean, calm — a single progress indicator, no partial results flickering in
- On completion: "Your Preflight Summary is ready" — transition into Review
- If the pilot returns to Intent and re-runs: same transition, summary refreshes

### Output Layering

The Preflight Summary is layered. The pilot is never presented with everything at once.

**Layer 1 — Top-level verdict (always visible)**

A plain-language summary of the flight as a whole. One or two sentences. Uses verdict terminology only.

> *"Conditions at KIAD and KOKV are within minimums for VFR Day. One item requires your attention before departure."*

Accompanied by a single status indicator for the overall check — Within Minimums / Marginal / Below Minimums / Not Legal. Color per the system below.

**Layer 2 — Per-station summary (expanded by default)**

Each airport in the route shown as a card:
- Station identifier, name, local time
- Flight category
- Wind (direction, speed, gusts, crosswind component)
- Visibility and ceiling
- Verdict for this station against active minimums
- Density altitude with humidity correction
- Sunrise/sunset — day/night threshold
- "See details" affordance to expand full METAR/TAF interpretation

**Layer 3 — Advisories (collapsed by default, count shown)**

G-AIRMETs, SIGMETs, Convective SIGMETs, PIREPs relevant to the route. Collapsed to a count indicator when none are active or all are informational. Expanded automatically if a Convective SIGMET or active SIGMET is on route.

**Layer 4 — Route intelligence (collapsed by default)**

Winds aloft, headwind/tailwind component, freezing level, hemispheric rule, DC SFRA/FRZ proximity, terrain warnings, CONUS boundary detection, IFR alternate requirement.

**Layer 5 — Pilot readiness (collapsed by default)**

IMSAFE, currency items — shown only if entered in Intent. If not entered, a small prompt: "Add pilot readiness items" with a link back to Intent.

**Layer 6 — Full detail**

Raw METAR and TAF text, full winds aloft bulletin excerpt, complete advisory text. Available via "View raw data" within each section. Never shown by default.

### Adjusting Inputs from Review

The pilot can return to Intent at any time without losing their Preflight Summary. Changing any input that requires a re-fetch (new airport, significant time change) shows a clear indicator: "Re-run Preflight Check to update." Changes to minimums or mode that can be resolved locally re-evaluate instantly without a new fetch.

### Color System

Used for verdicts and status indicators only — never decorative.

| Status | Color | Usage |
|---|---|---|
| Within Minimums | `#4ADE80` (desaturated green) | Conditions meet all active minimums |
| Marginal | `#FBBF24` (amber) | Conditions at or near a minimum threshold |
| Below Minimums | `#FB923C` (orange) | Conditions below at least one active minimum |
| Not Legal | `#FB923C` + bold label | Regulatory floor not met |
| Hazard callout | `#F87171` (muted red) | Convective SIGMETs, terrain — conditions only, never verdicts |

Red appears only on specific hazard callouts. It describes a condition — it never renders a determination.

---

## 6. Moment 3 — Dispatch (Detailed)

### Save Preflight Summary

- PDF via browser print — filename: `YYYY-MM-DD-CAPreflight-DEP-ARR.pdf`
- Text report download — filename: `YYYY-MM-DD-CAPreflight-DEP-ARR.txt`
- Every page of the PDF carries a footer: *"This Preflight Summary is a planning aid only and does not constitute an official FAA weather briefing. The Pilot in Command bears sole responsibility for the safety of the flight under FAR 91.3."*
- PIC name and acknowledgement timestamp recorded in every output

### Sign-off Blocks (Optional)

Three independent toggles — none assumed, none required.
- PIC confirmation block: name, certificate number, signature line, date
- CFI sign-off block: name, certificate number, signature line, date
- Student confirmation block: name, certificate number, signature line, date

Useful for recreational pilots, rental operations, flight schools requiring documented confirmation, and any other operational context. All are easy to add with a single tap. None appear by default.

### EFB Integration

- **→ ForeFlight** button: triggers `foreflightmobile://` URL scheme on iPad/iPhone
- **→ Garmin Pilot** button: copies full route string in DCT format for Garmin Pilot
- **→ FltPlan** button: copies full route string in DCT format for FltPlan.com
- **Copy Route** button: catch-all for any other EFB — copies full route string including waypoints (`KIAD DCT MAPAX DCT KOKV DCT KIAD`)
- Save-before-EFB prompt: if pilot taps any EFB button without having saved, a gentle prompt — "Save your Preflight Summary before continuing?" — with options to save or proceed

Garmin Pilot and FltPlan produce identical route strings but are labeled separately so the pilot doesn't need to know that.

### Logbook Summary

- Per-leg times from Intent inputs
- Wind-adjusted total flight time estimate (labeled as estimate)
- Labeled clearly: *"Wind-adjusted time is an estimate. If your entered flight time already incorporates wind correction, this figure may double-count the wind effect."*

---

## 7. Error States

### Unrecognized Airport Identifier

- Inline, immediate, non-blocking
- Small indicator beneath the field: "KXYZ not recognized"
- Pilot corrects without leaving the flow
- Does not prevent other fields from being filled

### API Failure (AVWX down or limit reached)

- Clean, honest error state — not a broken screen
- Plain language: "Weather data is currently unavailable. Try again, or obtain your briefing from 1800wxbrief.com."
- Direct link to 1800wxbrief.com
- Retry button

### Partial Failure (one station returned, another didn't)

- Show what is available
- Flag clearly what is missing — never silently omit a station
- The summary is explicitly marked incomplete
- Pilot is not left to assume the check is valid when it isn't

### Offline / No Connectivity

- Detected immediately on fetch attempt
- Calm banner: "No connection — weather data unavailable"
- If a Preflight Summary was already run this session, it remains readable from cache
- Pilot cannot re-run until connectivity is restored

---

## 8. Known Limitations Display

A dedicated "Limitations" section accessible at all times — not just in the output. Contains the full limitations inventory from `data.js`. Shown in the Preflight Summary PDF as a page. Categories: Not Yet Implemented, Geographic Limitations, Altitude Limitations, Terrain, Forecast Currency, General.

This section is always available but never intrusive. A small persistent link in the app footer: "Known limitations of this tool."

---

## 9. Technical Architecture

### Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Hosting | GitHub Pages (built `/dist` from `gh-pages` branch) |
| Backend | Google Apps Script (unchanged) |
| Data | `data.js` converted to ES module (`data.js` → `src/data/config.js`) |
| State | React context + `useReducer` for app state; local component state for UI |

### Why React/Vite

The three-moment interaction model — fluid state transitions, layered progressive output, reactive local recalculation — is significantly cleaner in React than vanilla JS. Vite produces optimized static output deployable to GitHub Pages with no server infrastructure.

### Backend (Apps Script) — Unchanged

The Apps Script backend continues to:
- Proxy all AVWX API calls (token protection)
- Aggregate weather API calls into a single batched response
- Handle CacheService TTLs server-side
- Expose a single `GET` endpoint the React frontend calls identically to the current HTML app

No changes to `Code.gs` are required for the frontend redesign. The Apps Script URL in `config.js` is the only connection point.

### Data Module

`data.js` becomes `src/data/config.js` — a standard ES module export. All existing data structures preserved:
- `CA_DATA.FAA_MINIMUMS`
- `CA_DATA.SCHOOL`
- `CA_DATA.INSTRUCTORS`
- `CA_DATA.DEFAULT_PERSONAL_MINS`
- `CA_DATA.MINIMUMS_FIELDS`
- `CA_DATA.LIMITATIONS`
- `CA_DATA.APPS_SCRIPT_URL`
- `CA_DATA.TZ_ABBRS`

### Winds Aloft Cycle Logic

Preserved exactly from current implementation. Valid `fcst` values: `06` and `12` only. `fcst=18` is invalid and always returns 400. Mapping:
- 00–01Z → `fcst=12`
- 02–07Z → `fcst=06`
- 08–13Z → `fcst=12`
- 14–19Z → `fcst=06`
- 20–23Z → `fcst=12`

`fetchWindText()` fallback logic preserved.

### PWA / Mobile

- `manifest.json` preserved for Android install prompt capability
- iOS Add to Home Screen supported via PWA meta tags — not announced or prompted
- `apple-mobile-web-app-status-bar-style: black-translucent`
- All touch targets minimum 44×44pt per iOS HIG
- Mobile-first layout — desktop enhances, mobile is primary

The app supports home screen installation silently. Pilots who find it useful will add it without being told.

---

## 10. Visual Design System

### Design Direction

Professional, utilitarian, refined. The aesthetic should feel like instrumentation — precise, trustworthy, built for a specific purpose. No decorative elements that don't carry information. Every visual decision earns its place.

### Color Tokens

```css
--color-base:         #0D1120;  /* Deep navy-tinted dark — base background */
--color-surface:      #141926;  /* Card and panel surface */
--color-surface-2:    #1C2333;  /* Elevated surface, inputs */
--color-border:       #2A3347;  /* Subtle borders */

--color-text-primary:   #E2E4EA;  /* Primary text */
--color-text-secondary: #8B90A0;  /* Labels, metadata, supporting info */
--color-text-muted:     #555F75;  /* Placeholder, disabled */

--color-brand-navy:   #1B2A4A;  /* Logo navy — used sparingly */
--color-brand-gold:   #B8963E;  /* Compass accent — key actions, selected states */

--color-within:       #4ADE80;  /* Within Minimums */
--color-marginal:     #FBBF24;  /* Marginal */
--color-below:        #FB923C;  /* Below Minimums / Not Legal */
--color-hazard:       #F87171;  /* Hazard callouts only — never verdicts */
```

### Typography

**Body font: IBM Plex Sans**
- Clean, technical character appropriate for an aviation tool
- Excellent mixed-case and number rendering
- Available via Google Fonts or self-hosted
- Weights used: 400 (body), 500 (labels), 600 (headings), 700 (verdicts)
- Slightly heavier weight than equivalent light-theme usage — dark background requires it

**Monospace font: IBM Plex Mono**
- Used for: airport identifiers, frequencies, route strings, METAR/TAF raw text, coordinates, any data value that benefits from fixed-width rendering
- Immediately distinguishes data from labels
- Pairs naturally with IBM Plex Sans

**Scale (mobile-first, rem-based):**
```
Display:   1.5rem  / 600  — section headers
Title:     1.125rem / 600 — card titles, station names  
Body:      1rem     / 400 — general text
Label:     0.875rem / 500 — field labels, metadata
Small:     0.75rem  / 400 — timestamps, secondary detail
Mono:      0.875rem / 400 — data values, identifiers
```

**Contrast:** All text meets WCAG AA minimum (4.5:1 for body, 3:1 for large). Primary text on base background exceeds AA.

### Spacing

8pt grid throughout. Primary spacing tokens: 4, 8, 12, 16, 24, 32, 48px. Generous line height (1.5–1.6 for body text) — dense information needs room to breathe.

### Logo

- Use transparent PNG version
- Placed top-left in a slim persistent header
- Small — approximately 32px height
- Never competing with the active content
- The tool is the experience, not the brand

### Motion

Subtle and purposeful. Transitions serve orientation, not decoration.
- Moment transitions: gentle fade + slight upward movement (200ms ease-out)
- Card expansion (layer reveal): height transition (150ms ease)
- Loading state: single pulsing indicator — never skeleton screens that feel broken
- Status color application: brief fade-in when results arrive (100ms)
- No animations that delay the pilot's ability to read information

---

## 11. Known Bugs — Do Not Re-Introduce

These were fixed in the current implementation. Preserve all fixes in the rewrite.

1. G-AIRMET: `hazard=sierra,tango,zulu` is invalid — query each hazard individually
2. G-AIRMET: string coordinates break polygon math — always `parseFloat()`
3. G-AIRMET: wrong field names — use `expireTime`, `base`/`top` as strings
4. `fcst=00` → `fcst=24` for NWS midnight cycle — use correct lead time mapping
5. `fcst=18` is invalid — never use, replaced with correct lead time logic
6. PIREP: `rawFltLvl > 0` guard — prevents 0ft false altitude
7. DC FRZ: `parentAlreadyInside` suppression — prevents false alarm when inside SFRA
8. UNKNOWN flight category (AWOS-1/2) — was false positive, now flagged as a concern not a verdict
9. Empty FD bulletin not cached — validate `text.includes('3000')` before caching
10. `fcst=18` in `fetchAll` batch — fallback handled in post-processing

---

## 12. Regulatory References

All existing regulatory references from the current implementation are preserved.

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

---

## 13. What Is Not Built (Preserved Roadmap)

**Phase 3 — Aircraft & Performance** *(not started)*
- Weight and balance from aircraft profile
- Takeoff and landing distance per runway
- Fuel burn and reserve calculations
- Aircraft-specific TAS for wind-adjusted time estimates
- Aircraft-specific density altitude limits

**Pending integrations:**
- NOTAMs / TFRs (pending FAA API key — always direct pilot to 1800wxbrief.com)
- Alternate airport weather fetch
- Approach minimums (procedure-specific)

**Platform migration (future):**
- Django + PostgreSQL backend
- Multi-school, multi-instructor, multi-aircraft
- Student dispatch workflow with CFI approval
- Persisted minimums and preferences
- Logbook integration
- Compliance framework

---

*This spec reflects design decisions made in session. For full build history and prior architectural decisions, see `/mnt/transcripts/` and `journal.txt`.*
