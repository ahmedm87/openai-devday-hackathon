# Build plan

Start with A: a guided station-to-station journey planner. C, a conversational interface, is a stretch goal after the complete core journey works with real data and an OpenAI key.

## Two-person split

- Person 1: FastAPI adapters, live TfL and weather verification, OpenAI explanation, provider-failure tests.
- Person 2: React/MapLibre UI, browser checks, deployment, README and demo recording.
- Integrate early using `GET /api/stations` and `POST /api/plan`. Keep the request and response contract stable while both work.

## Release gates

- A real station pair returns usable TfL journeys and matching line context.
- Map selection matches the route card and journey steps.
- Weather hours overlap the journey window in London time.
- Missing weather, status or AI data is explicit; no silent sample substitution.
- Add OpenAI key and verify a real explanation is grounded in the supplied evidence.
- Test narrow screens, no routes and provider errors.
- Deploy to a Python-capable host and verify the URL in a signed-out browser.
- Record a video of 90 seconds or less, update README with its URL, and credit code/assets.

## Upgrade to C only after the gates pass

Add a chat panel that calls a bounded `plan_journey` tool wrapping the existing planner. Resolve station names against the station list, ask the user to choose when ambiguous, validate tool arguments, and cap tool iterations. The backend continues to retrieve and normalize facts. Retain the same route cards, map, timestamps and unavailable-data states. Do not add multiple agents or a database for this upgrade.

## 90-second video outline

- 0–15s: commuter problem and station input.
- 15–40s: compare real routes and select one on the map.
- 40–60s: show disruption and endpoint weather context.
- 60–75s: explain AI interpretation versus retrieved facts and timestamps.
- 75–90s: show public repository and one concrete Codex contribution.

Record live data and a real AI response once credentials are available. If using sample mode, state clearly that it is synthetic and do not claim live functionality.
