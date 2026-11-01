# Suggested teammate post

Draft to copy into the team's existing chat. This has not been sent.

---

Quick Waywise update: the code is on public `main`:
https://github.com/ahmedm87/openai-devday-hackathon

The nine backend tests and frontend production build pass in CI. We still need to verify the complete live journey, test the browser flow and deploy. A local `.env` has been added, but API access is not yet verified; please keep keys out of chat and Git.

We're building **A first: a guided station-to-station planner**. Chat mode C is a stretch goal only after A works publicly.

Suggested split:
- **Ahmed + Codex:** live TfL/weather/OpenAI integration and backend fixes.
- **You:** run the UI, check route/map selection on desktop and mobile, and prepare deployment. Let's agree the hosting account first.

Please pull current `main` and use a separate feature branch. Setup is in the README. Let's coordinate before changing the API contract or editing the same file.

Checkpoints today, London time:
- **14:30:** show one real journey end to end and share blockers/PRs.
- **15:15:** A should be deployed; decide whether chat is still realistic.
- **16:00:** feature freeze; finish the ≤90-second demo and README links.
- **16:30:** final signed-out link checks and submission preparation.
- **17:00:** submission deadline; aim to submit earlier.

The detailed plan and acceptance checklist are here:
https://github.com/ahmedm87/openai-devday-hackathon/blob/main/docs/BUILD_PLAN.md

First action: get your local UI running from the README and confirm whether you can take the UI/deployment track. Flag setup or hosting blockers immediately. Sample mode is available for interface checks, but we'll clearly label it as fictional and demonstrate real data once verified.
