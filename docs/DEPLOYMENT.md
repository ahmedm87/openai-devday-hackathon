# Deployment handoff — prepared, not deployed

The current scope is deployment files only. No hosting project, subscription or public app deployment has been created by this work.

## Container contract

- The Dockerfile builds React in a Node stage and copies only its production output into a Python/FastAPI image.
- FastAPI serves both `/api/*` and the frontend on one origin. No frontend API hostname or production CORS configuration is needed.
- The server listens on `0.0.0.0` and uses the host's `PORT`, defaulting to `8000`.
- Health/readiness endpoint: `GET /api/health`. A successful response confirms the server is running, not that upstream credentials work.
- No persistent disk or database is required. The station cache and AI request limit are per process. Use one process/replica for the demo; put a shared limiter in front before scaling.
- `.env`, `.local`, Git metadata and local dependency folders are excluded from the Docker build context. Never copy local keys into an image layer or frontend build variable.

## Local container rehearsal

Requires Docker with Compose. From the repository root, with a local `.env` already configured:

```sh
docker compose up --build
```

Open http://127.0.0.1:8000 and verify a real journey. The included Compose file binds the app to loopback, so it does not expose the development instance to the network. Set `WAYWISE_PORT` to change the local port.

For a plain Docker deployment:

```sh
docker build -t waywise .
docker run --rm --env-file .env -e PORT=8000 -p 127.0.0.1:8000:8000 waywise
```

## Host configuration when deployment is authorized

1. Choose a Python/container-capable host and confirm the account and cost before creating paid resources.
2. Connect the intended GitHub branch and use the root Dockerfile. Point the host's health check to `/api/health`.
3. Configure `OPENAI_API_KEY` and `TFL_APP_KEY` as server-side secrets. Set `OPENAI_MODEL`, optional `TFL_APP_ID`, and `AI_REQUESTS_PER_MINUTE` as runtime configuration. A blank template is in `deploy/runtime.env.example`.
4. Use a single server process/replica for the demo. The AI cap limits all users together; it is not authentication or a substitute for host rate limiting and a provider spending budget.
5. Configure the OpenAI project's spending controls in the account before making billable calls publicly available.
6. After deployment, open the app while signed out, check the real flow below and add the literal working URL to README.

## Public demo acceptance

- Select two real stations, find routes and select another route; card, map and steps must agree.
- Verify endpoint weather, relevant line context, timestamps and the real AI explanation.
- Confirm missing data stays explicit and sample mode stays labelled as fictional.
- Check a mobile viewport and map attribution.
- Confirm keys do not appear in frontend assets, API responses or logs.
- Check the public app, repository and final video links while signed out.

## Rollback

Keep the last verified guided-planner commit available. If optional chat or another late change breaks the demo, redeploy that commit. If OpenAI is unavailable, preserve usable route/weather results and show the explicit unavailable state; do not replace a failed real response with a sample explanation.
