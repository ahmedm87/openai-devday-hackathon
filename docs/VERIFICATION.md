# Integration verification — 1 November 2026

The latest map-first checks are in [MAP_FIRST_HANDOFF.md](MAP_FIRST_HANDOFF.md): 27 backend tests, 9 frontend tests, a passing production build, measured overlay spacing, real forecast-field and journey flows, narrow/reduced-height viewports and failure-state checks. The earlier baseline and conversational checks below remain historical evidence.

The baseline guided planner was verified on `codex/live-integration`, including commit `7268396`. The conversational feature slice was added in `d2b98df`, with additional coverage described below. No hosted deployment is claimed.

## Passed

- **20 backend tests locally**: the original 12 baseline checks plus station-name ambiguity, validated clarification choices, missing origins, follow-up preferences, unsupported constraints, bounded model calls, invalid choices and all three preference rankings. The original 12 baseline checks also passed in CI before the feature extension.
- **Frontend production build**, locally and in [GitHub Actions](https://github.com/ahmedm87/openai-devday-hackathon/actions/runs/41314399045).
- Dependency consistency check: `pip check` reports no broken requirements.
- Real station catalogue retrieval: 472 station entries after filtering the TfL response to supported station types.
- Real **Waterloo → Bank** and **King's Cross St. Pancras → Paddington** requests: three journey options, relevant line context, geometry, two endpoint forecasts and available OpenAI output for each checked request.
- Manual review of the updated AI output: the model selects evidence IDs and the backend supplies factual wording. Forecast probabilities are not rewritten as clear skies; line status is not rewritten as a guaranteed journey delay; zero walking-leg minutes are not presented as proof of no walking inside stations.
- Desktop browser: live station selections, journey submission, returned cards, map geometry, alternative-route selection, corresponding journey steps, weather/status context and source timestamps were inspected.
- Sample browser flow: fictional labelling, three route cards and alternative selection were inspected. Map attribution is visible.
- The earlier narrow-layout check at 520px is superseded by the frontend feedback checks: actual 1280×800 desktop and 320×844 / 389×844 / 391×844 narrow CSS viewports were inspected. There was no horizontal document overflow. Physical mobile-device validation is not claimed. See [frontend feedback handoff](FRONTEND_FEEDBACK.md) for the updated layout, map, chat and failure-state checks.

## Issues found and addressed

1. Initial local dependency downloads stalled. Pinned packages were downloaded from the official registries, verified against published checksums and installed from local caches. The scratch downloads and scripts live under ignored `.local/` and are excluded from the container context.
2. Cold TfL catalogue retrieval approached the original 25-second timeout. The catalogue request now allows 60 seconds; journey, status and weather requests retain their existing shorter timeout.
3. A free-form AI explanation introduced unsupported claims about conditions and delay. The displayed explanation now comes only from an evidence catalog computed by the backend. Unknown IDs fail closed to the explicit unavailable state.
4. Route drawing waited for basemap tile loading. Route layers now initialize when the style is ready, and live route geometry was visually verified.

## Local handoff

The app is served at **http://127.0.0.1:8000/** and was left running for user testing. Local credentials are loaded server-side from the ignored root `.env`.

The current handoff server was started with a local helper that reuses a recently retrieved station catalogue with its original timestamp and remaining one-hour cache lifetime. It does not substitute sample stations into live mode. The standard README startup command works too, with a cold catalogue fetch on first use.

## Not verified or not performed

- No hosted app, hosting subscription or public deployment was created; the user requested deployment files only.
- Docker/Compose files are prepared but a Docker image build and container rehearsal were not run here.
- Provider spending controls and a shared limiter for multiple replicas have not been configured. The included request cap is per process.
- Full mobile-device testing, a signed-out public demo check, the ≤90-second video and final submission remain outstanding.
- Conversational planning is now implemented on the integration branch. Hosting remains preparation only.

## Conversational feature slice

- `POST /api/chat` interprets a request using one bounded `plan_journey` function call and delegates to the existing live planner.
- Missing endpoints and ambiguous names produce clarification. Explicit candidate choices are validated and do not require another intent-parsing model call.
- The browser walkthrough of “Waterloo to Bank” returned Bank DLR/Underground choices. Choosing Bank Underground returned real route cards, map geometry, weather and evidence.
- The form and chat share quickest, less-walking and fewer-change preferences. Follow-ups reuse the active journey endpoints.
- Unsupported constraints are explicit rather than silently discarded. Model-generated transport prose is not used as a data source.
- The updated frontend production build passes. Chat history is page-local and the form remains available as a fallback.
