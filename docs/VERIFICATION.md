# Integration verification — 1 November 2026

Code verified on `codex/live-integration`, including commit `7268396`. These are checks of the current guided planner; they do not establish a hosted deployment or the optional conversational mode.

## Passed

- **12 backend tests**, locally and in CI: nested TfL line identifiers, route geometry conversion, summer-time handling, sample isolation, invalid sample pairs, no-key AI state, partial provider failures, no-route errors, ranking ties, relevant line filtering, the AI request cap, and rejection of unsupported explanation IDs.
- **Frontend production build**, locally and in [GitHub Actions](https://github.com/ahmedm87/openai-devday-hackathon/actions/runs/41314399045).
- Dependency consistency check: `pip check` reports no broken requirements.
- Real station catalogue retrieval: 472 station entries after filtering the TfL response to supported station types.
- Real **Waterloo → Bank** and **King's Cross St. Pancras → Paddington** requests: three journey options, relevant line context, geometry, two endpoint forecasts and available OpenAI output for each checked request.
- Manual review of the updated AI output: the model selects evidence IDs and the backend supplies factual wording. Forecast probabilities are not rewritten as clear skies; line status is not rewritten as a guaranteed journey delay; zero walking-leg minutes are not presented as proof of no walking inside stations.
- Desktop browser: live station selections, journey submission, returned cards, map geometry, alternative-route selection, corresponding journey steps, weather/status context and source timestamps were inspected.
- Sample browser flow: fictional labelling, three route cards and alternative selection were inspected. Map attribution is visible.
- A narrow-layout check had no observed horizontal document overflow at the browser's reported 520px viewport. The requested 390px override did not produce a 390px viewport, so **390px/mobile-device validation is not claimed**. The viewport override was reset afterward.

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
- Conversational mode C has not been implemented. Its deployment prerequisite has not been met.
