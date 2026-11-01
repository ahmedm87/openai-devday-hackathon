# Waywise — London Transport Intelligence

A station-to-station journey planner and conversational assistant for the DevDay Exchange Community Hackathon. React and MapLibre show route options; FastAPI coordinates TfL journeys, disruption context, Open-Meteo endpoint forecasts and OpenAI-assisted intent parsing and explanations.

## Features

- **Guided planner:** choose two TfL stations and prioritise quickest, less walking or fewer changes.
- **Ask Waywise:** type a journey such as “Waterloo to Bank with less walking”. The assistant uses the same live planner and updates the existing route cards and map.
- **Station clarification:** ambiguous names produce station-choice buttons; missing endpoints trigger a follow-up question.
- **Follow-up requests:** “same journey, fewer changes” reuses the current endpoints. A conversation stays in page memory and can be cleared.
- **Evidence view:** route steps, matching line status, endpoint forecasts, timestamps and evidence-constrained AI context remain visible.
- **Guided fallback:** the form remains available if chat is unavailable. Sample mode is visibly fictional and does not call live providers or AI.

Chat currently plans journeys leaving now. It does not silently apply unsupported requests for fares, step-free access, avoiding particular lines, arbitrary addresses or future departure times. See [feature guide](docs/FEATURES.md) for examples and scope.

## Local setup

Requires Python 3.11+ and Node.js 22+. Clone this public repository, then run from its root:

```sh
python -m venv .venv
```

Windows PowerShell:

```powershell
.\.venv\Scripts\python.exe -m pip install -r backend/requirements.txt
Copy-Item .env.example .env
.\.venv\Scripts\python.exe -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

macOS/Linux:

```sh
.venv/bin/python -m pip install -r backend/requirements.txt
cp .env.example .env
.venv/bin/python -m uvicorn backend.app:app --reload --host 127.0.0.1 --port 8000
```

In a second terminal:

```sh
cd frontend
npm ci
npm run dev
```

Open [the local app](http://127.0.0.1:5173). Vite proxies `/api` to FastAPI. The backend also provides [API documentation](http://127.0.0.1:8000/docs).

## Credentials and sample mode

Edit the ignored root `.env`: set `OPENAI_API_KEY` and, if required for your TfL access, `TFL_APP_KEY`. Older TfL registrations can also use `TFL_APP_ID`. Optional `OPENAI_MODEL` defaults to `gpt-4.1-mini`. Restart FastAPI after changing environment values. Never put keys in frontend variables or commit them.

Without an OpenAI key, real routes and weather can still work; the UI explicitly marks the explanation unavailable. TfL may restrict or rate-limit requests without a key.

The **Sample demo** is a separate fictional Waterloo-to-Bank scenario with synthetic times, routes, geometry, weather and a prewritten explanation. It makes no provider or AI requests and never silently replaces live data. It is useful for interface checks, not travel planning or proof of live integration.

## Checks and production build

Use the virtual environment's Python executable, or activate it before these commands:

```sh
python -m pytest backend/tests -q
cd frontend
npm run build
cd ..
python -m uvicorn backend.app:app --host 127.0.0.1 --port 8000
```

After a frontend build, restart FastAPI to serve the built app and API together on port 8000. A two-stage Dockerfile is included for a Python-capable container host:

```sh
docker build -t waywise .
docker run --rm -p 8000:8000 --env-file .env waywise
```

Production accepts the host's `PORT` variable. Configure runtime secrets through the host. A hosted demo and live OpenAI verification still require setup. Before exposing billable AI calls on an unrestricted public deployment, add request limits and configure a project spending budget.

## Data and limitations

- Ranking follows the selected preference: quickest uses duration, less walking uses TfL walking-leg minutes, and fewer changes uses transfer count. Duration breaks preference ties. Disruption status and weather provide context; they are not invented delay adjustments.
- [TfL Unified API](https://api.tfl.gov.uk) provides stations, journey geometry and line status. Some geometry may be missing. Line status is not a measured delay for the individual journey.
- [Open-Meteo](https://open-meteo.com/) provides hourly forecasts near the origin and destination, not weather along the entire route. Forecast times and retrieval times are shown separately. Provider update times are unavailable when not supplied.
- London timestamps use `Europe/London`, including daylight saving. Station data is cached for one hour; journey, status and forecast data are fetched per search.
- The AI selects useful context, tradeoffs and limitations from an evidence catalog computed by the backend. The server renders fixed factual wording and rejects unknown evidence IDs, preventing free-form claims about unmeasured delays, clear skies or guaranteed zero walking. This does not make provider forecasts or journey estimates guarantees.

## Deployment preparation

See [deployment handoff](docs/DEPLOYMENT.md) for the container contract, local Compose rehearsal and host setup checklist. Deployment files are prepared; no hosted app has been created. `AI_REQUESTS_PER_MINUTE` defaults to 10 across all visitors in a single process, with explicit limit messages. Configure provider spending controls and use a shared limiter before scaling to multiple replicas.

## Credits and collaboration

Map rendering: [MapLibre GL JS](https://maplibre.org/). Basemap: [OpenFreeMap](https://openfreemap.org/) and [OpenStreetMap contributors](https://www.openstreetmap.org/copyright), with visible map attribution. Fonts: DM Sans and Manrope from Google Fonts. AI integration uses the [OpenAI API](https://developers.openai.com/api/docs/guides/structured-outputs?api-mode=responses).

Application code was created during the hackathon with Codex assistance, following initial README/contribution boilerplate. No pre-existing application template was used. Codex scaffolded the app, inspected the TfL schema, corrected nested line identifiers and London timezone handling, and wrote tests for provider failures and sample isolation.

See the [two-person build plan and demo outline](docs/BUILD_PLAN.md) and [contribution guide](CONTRIBUTING.md). Work on feature branches and pull current `main` before starting. The conversational feature is on the integration branch alongside the guided planner.

Submission still needs a deployed URL, real OpenAI verification, and a demo video of no more than 90 seconds.
