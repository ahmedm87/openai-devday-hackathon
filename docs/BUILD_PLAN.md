# Next-step plan — Waywise

Prepared 1 November 2026, around 13:50 London time. Submission deadline: **17:00 London time today**. Owner assignments below are suggested; agree them at the first check-in.

## Goal and current state

Ship A: one complete station-to-station journey with real TfL options, relevant disruption context, endpoint weather, selectable map routes and a grounded OpenAI explanation. C, a conversational interface, is optional after the core product is verified and deployed.

- Public repository and initial React/MapLibre/FastAPI implementation are on `main`.
- All 12 backend tests and the frontend production build pass locally and in [integration-branch CI](https://github.com/ahmedm87/openai-devday-hackathon/actions/runs/41314399045).
- Local credentials have been verified with real TfL, Open-Meteo and OpenAI calls. Secret values remain outside Git.
- Two real journey pairs and the desktop browser flow have been checked. See the [verification record](VERIFICATION.md) for exact coverage and limitations.
- Localhost is available for user testing. Deployment files are prepared; the user requested preparation only, so a hosted app and final video remain unfinished. Full mobile-device testing remains outstanding.
- Synthetic sample mode is available for interface checks. Never describe it as live data or an AI-generated response.

## Two-person work split

| Suggested owner | Workstream | First deliverable | Files to own initially |
| --- | --- | --- | --- |
| Ahmed + Codex | Backend and live integration | One real journey response with TfL, endpoint weather and a real OpenAI explanation | `backend/`, dependency changes |
| Teammate | Browser checks and deployment | App running locally; selected route matches map and journey steps; deployment target ready | `frontend/src/`, deployment configuration |
| Both | Integration and submission | Public demo verified while signed out, README links and ≤90-second recording | Coordinate README changes before editing |

Start from current `main` on separate branches, for example `feature/live-integration` and `feature/ui-deployment`. Push small commits early and use pull requests. Keep `GET /api/stations` and `POST /api/plan` stable; agree any response changes before implementing them. Do not both edit the same frontend file at once.

## Schedule and checkpoints

| London time | Backend track | Frontend/deployment track | Checkpoint |
| --- | --- | --- | --- |
| 13:50–14:00 | Confirm `.env` variable names match the README; start FastAPI; check `/api/health` | Pull `main`, install with `npm ci`, start Vite; agree the hosting account to use | Both can run the app; any setup blockers identified |
| 14:00–14:30 | Verify live stations and at least two London station pairs; check weather hours and real AI output | Test desktop and narrow-screen flow; prepare a Python-capable deployment; preserve map attribution | 14:30: demonstrate one real journey together |
| 14:30–15:15 | Fix provider/grounding failures; confirm useful results remain if one source fails | Deploy A; verify map, API requests and runtime secrets on the deployed app | 15:15: core flow works at a public URL, or all effort stays on A |
| 15:15–16:00 | Optional bounded chat tool only if the gate below passes; otherwise fix A | Support chat integration only if approved at checkpoint; otherwise improve usability and deployment | **16:00 feature freeze**; keep a working A version recoverable |
| 16:00–16:30 | Final checks on merged `main`; verify fixes in CI and deployment | Record the demo; add public app and video links to README | Complete submission package ready |
| 16:30–17:00 | Both: test links while signed out, verify submission details, submit and keep confirmation | Both: resolve submission blockers only | Submit before 17:00; retain buffer |

If starting late, compress the optional work first. Do not take time from the final submission buffer.

## Core acceptance checklist

### Real journey and evidence — backend owner

- [x] `.env` is ignored by Git; secret values have not been added to commits or screenshots.
- [x] `/api/health` reports the intended API configuration, and actual provider calls have been verified.
- [x] Two different real station pairs return usable routes with retrieved durations and route names.
- [ ] Only line statuses relevant to returned routes are attached. Do not turn a line-level disruption into an invented number of delay minutes.
- [ ] Forecast hours overlap the journey in London time; forecast coverage is described as near the endpoints.
- [x] Real OpenAI output selects context from a computed evidence catalog; the backend renders verified wording and rejects unknown evidence IDs. It preserves the recommended route and does not infer unmeasured delays, cloud cover or guaranteed zero walking.
- [x] Tests verify explicit missing weather/status/AI states while preserving usable route facts.

### Interface and deployment — frontend owner

- [ ] Origin/destination changes clear stale results; swapping stations and choosing a different route work.
- [ ] Selected route card, map and journey steps agree. Missing geometry is explicit; map attribution stays visible.
- [ ] Facts, AI interpretation, retrieval times and unavailable provider-update times are distinguishable.
- [ ] Sample mode is visibly fictional and never silently replaces a failed live request.
- [ ] Check a narrow screen, identical stations, no route results and a provider failure.
- [ ] Public app loads while signed out, and a full journey succeeds there. Keep runtime secrets on the server.
- [x] Add a per-process shared AI request cap with an explicit limit message.
- [ ] Before public billable AI access, configure the OpenAI project's spending controls and host-level limits. No hosted deployment has been performed.

## Optional C: decision at 15:15

Proceed only if A is deployed, a real OpenAI response is verified, the acceptance checks have no blocking failures, and both people agree that recording/submission time is protected. Otherwise skip C for this submission.

Add one chat panel that calls a bounded `plan_journey` tool around the existing planner. Resolve station names against the real station list and ask the user to choose when ambiguous. Validate tool arguments, cap tool calls and keep the existing cards, map and evidence display. Preserve the guided form as a fallback. No accounts, database, voice, notifications or multiple-agent architecture in this extension.

## Submission package

- [ ] Public GitHub repository with working setup instructions and dependency lockfile.
- [ ] Public deployed app URL and video URL in README, both tested while signed out.
- [ ] Demo video no longer than 90 seconds.
- [ ] Concrete Codex contribution shown: TfL schema inspection, nested line-identifier correction, London timezone handling or failure-path tests, backed by code/commits.
- [ ] Existing boilerplate, libraries, fonts and data/map sources credited.
- [ ] No secrets, private email details or personal journey history in the recording.
- [ ] Submission sent before 17:00; confirmation retained.

### Suggested 90-second recording

0–15s: commuter problem and station input. 15–40s: real route comparison and map selection. 40–60s: disruption and weather context. 60–75s: AI explanation, evidence and timestamps. 75–90s: repository and a concrete Codex contribution. If any sample data is used, say so explicitly.

## Team coordination

Use the [suggested teammate post](TEAM_UPDATE.md) to share this plan. At 14:30 and 15:15, each person reports: current branch/PR, what works, the main blocker and the next deliverable. Surface credential or hosting blockers immediately rather than waiting for a checkpoint.
