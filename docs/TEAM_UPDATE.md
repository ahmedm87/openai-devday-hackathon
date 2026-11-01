# Suggested teammate post

Draft to copy into the team's chat; this has not been sent.

---

Waywise’s latest work is on **`codex/live-integration`**:
https://github.com/ahmedm87/openai-devday-hackathon/tree/codex/live-integration

The guided planner and conversational planning work with live TfL, forecasts and evidence-based OpenAI explanations. There are 27 passing backend tests, four passing frontend tests and a passing production build.

The new map-first handoff is implemented: a full-screen map, one Journey / Ask AI search surface, searchable London stations and an explicit Summary / Routes / Details sheet. Layers include independent journey visibility, endpoint forecasts, journey-scoped disruptions and a bounded Temperature / Rain chance field. The field has fixed legends, forecast-time/opacity controls and source-value details. Sample mode disables the area field. Selecting another route keeps the explanation tied to the recommended option.

Please pull the integration branch, rebuild the frontend and restart FastAPI using the README. Keep keys in your ignored local `.env`.

Suggested review:

1. Plan a live journey with the station fields, select another card/path and inspect status, forecast timestamps and source details.
2. Ask “Waterloo to Bank”, choose Bank Underground, then ask “Same journey with fewer changes”. Confirm selectors, preference, cards and map stay in sync.
3. Check the interface on your phone, particularly forecast details, touch targets, conversation choices and long station names. Physical touch-device and screen-reader checks are still outstanding.
4. Inspect Weather's quantity/time controls and a sampled cell, then Disruptions' line-context badge. Review the explicitly labelled sample separately from live results. Screenshots, limits and verification notes are in `docs/MAP_FIRST_HANDOFF.md`.

Please use a separate feature branch and coordinate before changing API contracts or the same frontend files. Hosting remains **deployment files only**; no hosted app or main merge has been performed for this update.

Next shared milestone: finish the colleague review and demo recording, then agree any hosting/submission work before the 17:00 London deadline.
