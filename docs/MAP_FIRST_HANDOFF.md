# Map-first explorer handoff — 1 November 2026

The map-first design is implemented on `codex/live-integration`, starting with `d915386`. The earlier permanent-sidebar layout is superseded. Hosting remains preparation only.

## Shipped

- `MapAppShell` fills the viewport. The body does not become a scrolling document; search, conversation and expanded evidence scroll within bounded panels.
- One `SearchDock` switches between Journey and Ask AI. Journey uses searchable suggestions from the supported station catalogue and submits resolved IDs. Addresses and arbitrary map points are not accepted as station routing.
- The guided planner, clarification choices and conversational follow-ups share endpoints, preference, results and selected route. Successful requests close search. Escape closes nonessential panels, and focus returns to a visible control.
- `ResultsDock` has explicit Summary, Routes and Details states. Up to three summaries show duration, reported walking, changes and line names. Recommendation and selection are distinct. The short explanation always names the recommended option; Details contains the complete returned explanation, limitations, steps, forecasts, reasons and timestamps.
- Refresh retains the last successful journey while updating. Failure keeps that snapshot, labels it as previous, and exposes the error. Input/preference/data-mode changes invalidate the old trip. A shared request lock and request generation guard prevent competing updates.
- One MapLibre instance survives panel, route and layer changes. Sources update with `setData`; a resize observer resizes the map. A new journey or explicit Fit journey fits bounds using overlay measurements. Layer changes preserve pan/zoom.
- Journey visibility is independent of the Off / Weather / Disruptions context choice. Alternatives are muted, selected paths draw above them, walking is dashed, and missing sections are not joined.
- Weather shows actual endpoint forecast values at station coordinates, with details in the bounded sheet. Disruptions uses matching selected-route legs, returned line descriptions/reasons and route notices. Amber corridors/badges mean line/route context, not incident locations or measured delay.
- Temperature and Rain chance area fields use GeoJSON sampling polygons under labels/routes. Coverage, units, fixed colour scales, selected forecast period, opacity, retrieval time and approximation are explicit. Selecting a cell exposes its requested/returned coordinates and source values.
- Sample mode is visibly fictional. It uses existing endpoint fixtures and disables the area field; it does not initiate live journey, weather-field or AI provider calls.

## New weather endpoint

`GET /api/map/weather?area=london-demo` uses a server-defined 5×5 grid over **[-0.32, 51.40, 0.12, 51.64]** (west, south, east, north). This is a central-London demonstration extent, not all Greater London. The basemap continues beyond it.

The endpoint returns four hourly periods, coverage bounds, application cell footprints, requested coordinates, canonical samples with returned coordinates, values/units, available variables, retrieval time and source. Provider update time, model and resolution remain null when absent. Duplicate returned locations share one canonical series; missing values stay null and render transparently rather than as zero. Footprints are application sampling areas, not native model boundaries. No interpolation or extrapolation is used.

Temperature is evaluated at the selected period start. Rain chance uses the provider timestamp ending that period, with its interval labelled. Requesting five timestamps supplies four complete displayed periods.

A batch requests 25 locations; one HTTP request does not mean one location for provider usage. The cache is per process, keyed by fixed extent/grid, variables and UTC hour, with a 10-minute lifetime, concurrent-request coalescing and a 30-second failure backoff. Variable/time/opacity changes and map movement do not fetch new data. Field failures are independent of journey planning. `sample=true` returns an explicit disabled response without contacting the provider.

References: [Open-Meteo forecast parameters and intervals](https://open-meteo.com/en/docs), [MapLibre map API](https://maplibre.org/maplibre-gl-js/docs/API/classes/Map/).

## Verification completed

- **27 backend tests** and **4 frontend tests** pass; production build passes. CI now runs the frontend tests too. The existing large-bundle warning remains.
- Real King's Cross → Paddington: station autocomplete, keyboard station selection, Enter submission, automatic panel collapse, returned route selection, endpoint forecasts and evidence inspected.
- Real Bakerloo service context on an alternative: visible Severe Delays badge, selected-leg corridor, full returned reason and retrieval time. The recommendation stayed attached to Option 1 when Option 3 was selected.
- Real 25-location Open-Meteo batch normalised successfully. Temperature/Rain chance, forecast-period selection, opacity and coverage controls checked. A selected cell showed the matching zero rain value and requested/returned coordinates.
- Changing variable/time and toggling Weather reused the browser cache; the inspected server log contained one field GET across those interactions. Routes remained selected, with one map canvas.
- Chat “Waterloo to Bank” offered Bank DLR/Underground choices. Choosing Bank Underground updated the shared trip; “same journey with fewer changes” returned a new plan, changed preference and collapsed search.
- Isolated localhost failure fixture: unavailable AI state, chat error, missing line/endpoint/area forecasts, and failed refresh. Three real route summaries remained present during and after refresh failure, with previous-snapshot labels. The fixture server was stopped after use.
- Actual 1280×800, 389×844 and 320×844 CSS viewports checked. The 390px target is represented by the adjacent 389px width because the browser's existing zoom rounds integer overrides. A reduced 320×500 viewport checked internal scrolling to Find journey, 16px editable inputs, Escape and bounded page dimensions. Expanded mobile sheet controls clear the search bar.

Local screenshots are in `artifacts/waywise-map-first-2026-11-01/` and a ZIP alongside it. They are sharing artifacts, not committed source. Local preview: http://127.0.0.1:8000/.

## Deferred / unverified

- Physical touch devices, an actual on-screen keyboard, screen readers and browsers other than Chrome have not been tested. Reduced-height viewport checks are not a physical keyboard test.
- Smoothing/interpolation, radar, rain amount, cloud cover, radiation, BikePoint, road incidents, general-address geocoding and preview animations are deferred.
- No hosted app, Docker rehearsal, main merge or public deployment was performed for this change. The demo recording and final submission are still separate work.
