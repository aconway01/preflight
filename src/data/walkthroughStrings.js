export const WT = {

  STATUS: {
    WITHIN_MINIMUMS: "All stations on your route report conditions meeting your active minimums. Review each station below before continuing your planning.",
    MARGINAL: "One or more stations report conditions near your active minimums. Conditions are within limits but require careful review. Pay close attention to the station reports below.",
    BELOW_MINIMUMS: "One or more stations report conditions below your active minimums. Review the station reports carefully to understand which conditions are not met.",
    NOT_LEGAL: "One or more stations report conditions that may not meet regulatory requirements for {flightMode} flight. The Pilot in Command is the final authority for determining the legality and safety of the flight under FAR 91.3.",
    CONVECTIVE_SIGMET: "A Convective SIGMET is present on your route. Review the Advisories section carefully.",
  },

  FLIGHT_CATEGORY: {
    VFR:     "VFR — ceiling and visibility at {station} meet basic visual flight requirements.",
    MVFR:    "Marginal VFR — ceiling or visibility at {station} is near VFR minimums. Conditions are within legal limits but warrant attention.",
    IFR:     "IFR — ceiling or visibility at {station} reports conditions below basic VFR minimums (FAR 91.155).",
    LIFR:    "Low IFR — severely reduced ceiling or visibility at {station}. Conditions are significantly below VFR minimums.",
    UNKNOWN: "{station} has limited weather reporting. Flight category cannot be determined. Consult nearby reporting stations for conditions.",
  },

  CEILING: {
    CLEAR:          "No ceiling reported at {station} — sky is clear or few clouds below 5,000ft.",
    ABOVE_PERSONAL: "Ceiling {ceilingFt}ft at {station} — above your personal minimum of {personalMinCeil}ft.",
    BELOW_PERSONAL: "Ceiling {ceilingFt}ft at {station} is below your personal minimum of {personalMinCeil}ft. Conditions do not meet your active minimums.",
    BELOW_FAA:      "Ceiling {ceilingFt}ft at {station} is below the FAA VFR minimum of 1,000ft AGL in controlled airspace (FAR 91.155).",
    TEMPO:          "A temporary condition (TEMPO) in the forecast shows ceiling dropping to {tempoCeil}ft. Review timing relative to your planned arrival.",
  },

  VISIBILITY: {
    ABOVE_PERSONAL: "Visibility {visSM}SM at {station} — above your personal minimum of {personalMinVis}SM.",
    BELOW_PERSONAL: "Visibility {visSM}SM at {station} is below your personal minimum of {personalMinVis}SM. Conditions do not meet your active minimums.",
    BELOW_FAA:      "Visibility {visSM}SM at {station} is below standard VFR minimums for most controlled airspace (FAR 91.155). Verify airspace-specific requirements.",
    GOOD:           "Visibility {visSM}SM at {station}.",
  },

  WIND: {
    CALM:               "Wind reported as calm at {station}.",
    LIGHT:              "Wind {windDir}° at {windSpeed}kts at {station} — within your active limits.",
    WITHIN_LIMITS:      "Wind {windDir}° at {windSpeed}kts at {station} — within your active limits.",
    GUSTING:            "Wind {windDir}° at {windSpeed}kts gusting to {gustSpeed}kts at {station}. Gust factor of {gustFactor}kts. Consult your POH for gust considerations during approach and landing.",
    GUSTING_INFO:       "Wind {windDir}° at {windSpeed}kts gusting to {gustSpeed}kts at {station}. Gust factor of {gustFactor}kts. Consult your POH for gust considerations during approach and landing.",
    GUSTING_EXCEEDED:   "Gusts of {gustSpeed}kts at {station} exceed your active maximum of {maxGustKts}kts.",
    CROSSWIND:          "Crosswind component approximately {crosswind}kts at {station} — within your limit of {maxXwd}kts.",
    CROSSWIND_HIGH:     "Crosswind component approximately {crosswind}kts at {station} — near your defined limit of {maxXwd}kts. Review aircraft crosswind capabilities in your POH.",
    CROSSWIND_EXCEEDED: "Crosswind component approximately {crosswind}kts at {station} exceeds your active limit of {maxXwd}kts.",
    TOTAL_EXCEEDED:     "Total wind {windSpeed}kts at {station} exceeds your active limit of {maxTotalWind}kts.",
    VRB:                "Variable wind direction reported at {station}. Crosswind component cannot be calculated — verify runway conditions.",
  },

  DENSITY_ALTITUDE: {
    NORMAL:         "Density altitude {densityAlt}ft at {station} — {daAboveField}ft above field elevation.",
    CAUTION:        "Density altitude {densityAlt}ft at {station} is above your caution threshold of {cautionDA}ft. High density altitude typically results in reduced aircraft performance. Consult your POH performance charts.",
    BELOW_MINIMUMS: "Density altitude {densityAlt}ft at {station} exceeds your active limit of {noGoDA}ft. Consult your POH performance charts.",
    NEGATIVE:       "Density altitude is {densityAlt}ft at {station} — below field elevation. Cool, dense air conditions.",
  },

  SPREAD: {
    GOOD:     "Temperature/dewpoint spread {spread}°C at {station} — low likelihood of fog or low cloud formation.",
    CAUTION:  "Temperature/dewpoint spread {spread}°C at {station} — narrow spread indicates moisture-laden air. Monitor for developing fog or low clouds, particularly at night and around sunrise.",
    CRITICAL: "Temperature/dewpoint spread {spread}°C or less at {station} — fog or low cloud formation is possible. Monitor conditions.",
  },

  DAY_NIGHT: {
    DAY:        "Day conditions at {station} at your planned departure time.",
    NIGHT:      "Night conditions at {station} at your planned departure or arrival time. Night currency requirements apply (FAR 61.57(b)).",
    NIGHT_SOLO: "Night conditions at {station} on a Student Solo flight. FAR 61.93 night solo cross-country endorsement requirements apply.",
  },

  TAF: {
    NOT_AVAILABLE: "No TAF is available for {station}. TAFs are issued for airports with scheduled commercial service or significant instrument operations. Consult nearby stations for forecast trends.",
    IMPROVING:     "The forecast at {station} shows conditions trending toward improvement during your planned flight window.",
    DETERIORATING: "The forecast at {station} shows conditions trending toward deterioration during your planned flight window. Review the TAF relative to your planned arrival time.",
    TEMPO:         "A temporary condition (TEMPO) is forecast at {station}. TEMPO periods typically last less than one hour. Review timing relative to your planned arrival.",
    PROB30:        "A 30% probability condition (PROB30) is forecast at {station} during your planned flight window.",
  },

  GAIRMETS: {
    NONE:           "No G-AIRMETs are active for your route area.",
    SIERRA_IFR:     "A SIERRA G-AIRMET is active for your route area — IFR conditions including ceilings below 1,000ft and/or visibility below 3SM. This is consistent with the station conditions shown in your report.",
    SIERRA_MT_OBSC: "A SIERRA G-AIRMET is active for mountain obscuration in your route area — mountains obscured by precipitation, clouds, or fog. Review terrain clearance carefully.",
    TANGO_TURB_LO:  "A TANGO G-AIRMET is active for low-level turbulence below 18,000ft in your route area. Review turbulence penetration speeds in your POH.",
    TANGO_TURB_HI:  "A TANGO G-AIRMET is active for high-level turbulence above 18,000ft. Relevant for high-altitude IFR operations.",
    TANGO_LLWS:     "A TANGO G-AIRMET is active for low-level wind shear in your route area. Wind shear can cause airspeed and altitude variations during approach and departure.",
    ZULU_ICING:     "A ZULU G-AIRMET is active for icing in your route area. Review aircraft limitations regarding flight into known icing conditions (FIKI) in your POH.",
    ZULU_FZLVL:     "A ZULU G-AIRMET notes the freezing level in your route area. Your freezing level is shown in Route Intelligence.",
  },

  SIGMETS: {
    NONE:       "No SIGMETs are active for your route.",
    ACTIVE:     "A SIGMET is active for your route area. SIGMETs are issued for significant meteorological conditions including severe turbulence, severe icing, and volcanic ash. Review the full SIGMET text in the Advisories section.",
    CONVECTIVE: "A Convective SIGMET is active for your route area. Convective SIGMETs are issued for significant thunderstorm activity. Review the full text in the Advisories section.",
  },

  PIREPS: {
    NONE:       "No recent PIREPs are available for your route area.",
    AVAILABLE:  "Pilot reports (PIREPs) are available for your route area. PIREPs are first-hand accounts from pilots who recently flew in the area — cloud bases, tops, turbulence, and icing conditions.",
    SMOOTH:     "Recent PIREPs in your area report smooth conditions.",
    TURBULENCE: "Recent PIREPs in your area report turbulence. Review the reported altitudes relative to your planned cruise altitude.",
    ICING:      "Recent PIREPs in your area report icing conditions. Review aircraft limitations in your POH.",
  },

  WINDS_ALOFT: {
    HEADWIND_LIGHT:    "A light headwind of {component}kts is forecast at cruise altitude on this leg.",
    HEADWIND_MODERATE: "A {component}kt headwind is forecast at cruise altitude on this leg. Groundspeed will be reduced relative to airspeed.",
    HEADWIND_STRONG:   "A {component}kt headwind is forecast at cruise altitude on this leg. Groundspeed will be significantly reduced. Verify fuel reserves are adequate.",
    TAILWIND_LIGHT:    "A light tailwind of {component}kts is forecast at cruise altitude on this leg.",
    TAILWIND_MODERATE: "A {component}kt tailwind is forecast at cruise altitude on this leg. Groundspeed will be higher than airspeed.",
    TAILWIND_STRONG:   "A {component}kt tailwind is forecast at cruise altitude on this leg. Groundspeed will be significantly higher than airspeed.",
    CALM:              "Light and variable winds forecast at cruise altitude on this leg.",
  },

  FREEZING_LEVEL: {
    WELL_ABOVE:   "Freezing level is at {fzlFt}ft — above your cruise altitude of {cruiseAlt}ft.",
    NEAR_CRUISE:  "Freezing level is at {fzlFt}ft — within 2,000ft of your cruise altitude of {cruiseAlt}ft. Monitor conditions in areas of cloud or precipitation.",
    BELOW_CRUISE: "Freezing level is at {fzlFt}ft — below your cruise altitude of {cruiseAlt}ft. Review aircraft limitations regarding flight in below-freezing temperatures in your POH.",
  },

  HEMISPHERIC: {
    PASS: "Your cruise altitude of {cruiseAlt}ft is consistent with the VFR hemispheric rule (FAR 91.159) for a {direction} flight on a {course}° course.",
    FAIL: "Your cruise altitude of {cruiseAlt}ft may not be consistent with the VFR hemispheric rule (FAR 91.159) for a {direction} flight on a {course}° course. The hemispheric rule is based on magnetic course — verify on your sectional chart.",
  },

  SFRA: {
    DC_SFRA_INSIDE:    "Your route operates within the Washington DC Special Flight Rules Area (SFRA). ATC clearance is required throughout. Transponder and Mode C are mandatory. Review 14 CFR Part 93 and current NOTAMs before flight.",
    DC_SFRA_PROXIMITY: "Your route passes within {distNm}nm of the Washington DC SFRA boundary. Review the 30nm SFRA and 15nm Flight Restricted Zone boundaries carefully before flight. Verify your position relative to the boundary using current charts.",
    DC_FRZ_INSIDE:     "Your route operates within the Washington DC Flight Restricted Zone (FRZ). Review 14 CFR Part 93 and current NOTAMs before flight.",
    OTHER_SFRA:        "Your route passes near {sfraName}. Review applicable airspace restrictions before flight.",
  },

  TERRAIN: {
    NONE:         "No significant terrain warnings for your route.",
    APPALACHIANS: "Your route passes through or near the Appalachian Mountains. Ridgelines reach 4,800ft MSL in this region. A standard safety margin of 2,000ft above the highest terrain is recommended — consult the AIM and your sectional MEFs. Terrain warnings in this tool are based on named region boundaries — actual terrain profile is not computed. Check sectional MEFs for every grid square along your route.",
    ROCKIES:      "Your route passes through or near the Rocky Mountains. Terrain regularly exceeds 10,000ft MSL in this region. A standard safety margin of 2,000ft above the highest terrain is recommended — consult the AIM and your sectional MEFs. Check sectional MEFs carefully.",
    SIERRA:       "Your route passes through or near the Sierra Nevada. Terrain regularly exceeds 12,000ft MSL in this region. A standard safety margin of 2,000ft above the highest terrain is recommended — consult the AIM and your sectional MEFs. Check sectional MEFs carefully.",
    CASCADES:     "Your route passes through or near the Cascades. Terrain regularly exceeds 10,000ft MSL in this region. A standard safety margin of 2,000ft above the highest terrain is recommended — consult the AIM and your sectional MEFs. Check sectional MEFs carefully.",
  },

  IFR_ALTERNATE: {
    NOT_REQUIRED: "An IFR alternate does not appear to be required for this flight under FAR 91.169 — the destination forecast appears to meet the 1-2-3 rule (ceiling at least 2,000ft and visibility at least 3SM from 1 hour before to 1 hour after ETA). Verify independently.",
    REQUIRED:     "An IFR alternate may be required for this flight under FAR 91.169. The destination forecast may not meet the 1-2-3 rule. The pilot should identify a qualifying alternate and verify its weather separately — this tool does not fetch alternate airport weather.",
    NULL:         "IFR alternate requirement could not be determined. Verify manually using FAR 91.169 and current forecasts.",
  },

  CONUS: {
    INSIDE:  "Your entire route is within the contiguous United States. Full route intelligence is available.",
    WARNING: "Your route exits the contiguous United States. Winds aloft, G-AIRMETs, and hemispheric rule checks are only available for CONUS routes. Route intelligence is degraded beyond the CONUS boundary.",
  },

  STATION_REPEAT: {
    SAME:  "Arrival forecast at {station} is consistent with departure conditions. Review the TAF for any changes during your flight window.",
    WORSE: "Arrival forecast at {station} shows deteriorating conditions compared to departure — {arrivalRecommendation}. Review carefully.",
    BETTER:"Arrival forecast at {station} shows improving conditions compared to departure — {arrivalRecommendation}.",
  },

  BEFORE_YOU_FLY: {
    NOTAMS:            "NOTAMs and TFRs are not included in this tool. Runway closures, navaid outages, and Temporary Flight Restrictions may affect your flight. Check via 1800wxbrief.com, ForeFlight, or the FAA NOTAM search before flight.",
    WEATHER_CHECK:     "This tool is a planning aid only and does not constitute an official FAA weather check. Obtain a standard weather check from 1800wxbrief.com or a certificated FSS before flight.",
    APPROACH_MINIMUMS: "Approach minimums are not included in this tool. Verify procedure-specific minimums from current approach plates before IFR flight.",
    ALTERNATE_WEATHER: "This tool flagged a potential IFR alternate requirement but does not fetch alternate airport weather. The pilot should verify the alternate meets FAR 91.169 requirements separately.",
    TERRAIN:           "This tool flagged terrain in your route area but does not compute actual terrain clearance. Check sectional MEFs for every grid square along your route.",
    WB:                "Weight and balance is not included in this tool. Complete a W&B calculation using your aircraft POH and an approved worksheet before flight.",
  },

}

export function interpolate(str, vars) {
  if (!str) return ''
  return str.replace(/\{(\w+)\}/g, (_, key) =>
    vars[key] !== undefined ? vars[key] : `{${key}}`
  )
}
