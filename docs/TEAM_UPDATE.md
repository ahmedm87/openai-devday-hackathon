# Suggested teammate post

Draft to copy into the team's chat; this has not been sent.

---

Waywise’s latest work is on **`codex/live-integration`**:
https://github.com/ahmedm87/openai-devday-hackathon/tree/codex/live-integration

The guided planner and conversational planning are working with live TfL, endpoint forecasts and evidence-based OpenAI explanations. There are 20 passing backend tests and a passing frontend production build.

The frontend feedback is implemented: compact desktop sidebar/sticky map, mobile ordering, collapsed conversation history with a visible composer, numbered route cards, the recommendation directly below its own option, muted alternatives, dashed walking, endpoint forecasts and selected-route service context. Selecting another map route keeps the recommendation attached to the original numbered option.

Please pull the integration branch, rebuild the frontend and restart FastAPI using the README. Keep keys in your ignored local `.env`.

Suggested review:

1. Plan a live journey with the station fields, select another card/path and inspect status, forecast timestamps and source details.
2. Ask “Waterloo to Bank”, choose Bank Underground, then ask “Same journey with fewer changes”. Confirm selectors, preference, cards and map stay in sync.
3. Check the interface on your phone, particularly forecast details, touch targets, conversation choices and long station names. Physical touch-device and screen-reader checks are still outstanding.
4. Review the explicitly labelled sample separately from live results. Screenshots and the latest verification notes are described in `docs/FRONTEND_FEEDBACK.md`.

Please use a separate feature branch and coordinate before changing API contracts or the same frontend files. Hosting remains **deployment files only**; no hosted app or main merge has been performed for this update.

Next shared milestone: finish the colleague review and demo recording, then agree any hosting/submission work before the 17:00 London deadline.
