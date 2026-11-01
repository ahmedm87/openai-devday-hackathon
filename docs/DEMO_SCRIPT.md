# Waywise demo — 3 minutes

One person presents; the other drives the browser and watches the clock. Open **http://127.0.0.1:8000/**. Keep this script on a second screen or device.

## Before you present

1. Pull `codex/live-integration`. The local preview is already running on Ahmed's computer. If restarting elsewhere, follow the repository README to install dependencies, build the frontend and start FastAPI. Keep credentials in the local environment; never show `.env` on screen.
2. Use a desktop browser. Close unrelated extension popups. Check that **Live** is selected and that **Journey** has Waterloo Underground Station and Bank Underground Station. Live routes depend on current service and can differ from this script.
3. Rehearse **Sample → Journey → Find journey → Worth the extra minutes?** once. This is the reliable, explicitly fictional demonstration of a walking improvement. It needs no provider credentials.
4. Return to **Live**, use the default stations and plan once. Confirm the map and route cards load. Put the results back on **Routes**. Have the sample fallback ready if live providers fail.

## 0:00–0:25 — the problem

**Say:** “The fastest route is not always the route you want to take. Waywise brings the journey, changes, reported walking, service context and endpoint forecasts together on one map.”

**Do:** Show the map, the selected route and its alternatives. Point to the retrieval time. Do not call a retrieved snapshot real-time tracking.

## 0:25–1:10 — a route you can follow

**Say:** “Choose an option and you can see where to board, where to change, and the stations in between.”

**Do:** Select a route card. Its **Stops** view opens automatically. Scroll the bounded list to the change. **Routes** returns to the comparison; **Details** adds notices and evidence.

**Live example, only if returned:** Waterloo → Lambeth North → Elephant & Castle; change from Bakerloo to Northern; Borough → London Bridge → Bank. Other valid options can go via London Bridge or Kennington. Read the actual selected list rather than promising this exact itinerary.

**Say:** “The stop order comes from TfL's journey response. The map distinguishes changes, and the list still works when a stop has no map coordinates.”

## 1:10–1:55 — worth the extra minutes?

**Do:** Press **Routes**, then **Worth the extra minutes?** Start with the default five-minute budget. Move the slider slowly.

**Say:** “How much extra time would you trade for less walking? This compares the returned options with the fastest one. As I change my time budget, the selected route changes on the map and the walking comparison updates immediately.”

If an improvement exists, read the actual travelling-time increase and reported walking reduction. Point to the destination rain forecast beside the decision. Press **Show this route** to open its stops.

If no improvement exists, say: “These returned options don't offer less reported walking inside this budget. Waywise says so rather than inventing a better route.” Zero reported walking is common for tube options; it does not mean there is no walking inside stations.

## 1:55–2:35 — reliable illustrative slider example

**Say first:** “I'll switch to the fictional sample so you can see both sides of the decision. These numbers are illustrative, not current travel advice.”

**Do:** Select **Sample → Journey → Find journey → Worth the extra minutes?**

- At **5 minutes**, the sample chooses the 16-minute route over the 12-minute baseline: **+4 minutes travelling, −4 minutes of reported walking**. The map highlights that alternative. The sample destination rain forecast is **70%**, explicitly illustrative.
- Reduce the slider to **3 minutes**: there is no better walking option within budget and the fastest sample route highlights.
- Increase it to **4 minutes**: the alternative returns immediately.
- Press **Show this route**: the selected sample route's stops and change appear.

**Say:** “The numbers are calculated from the returned routes, not written into the comparison. The sample simply makes the trade-off easy to demonstrate.”

## 2:35–3:00 — evidence and close

**Do:** Return to **Live** if time allows. Open **Details** on a live result to show service notices, endpoint forecasts and source times. Alternatively keep the clearly labelled sample on screen and explain the live evidence verbally.

**Say:** “We keep the recommendation separate from the route you're exploring. Service notices are context, not invented delay minutes. Weather is a forecast near the endpoints, not a claim about every street along the route. The aim is a choice you can understand: where you change, how much longer it takes, and how much reported walking it saves.”

## If something fails

- **Live provider or AI unavailable:** Show the explicit message and switch to Sample. Say it is fictional before using it. The sample is not an AI-generated/live result.
- **Map tiles unavailable:** The Stops and Details lists still provide the journey facts. Do not claim a visible map highlight when the map is unavailable.
- **No walking improvement:** This is a valid result. Use the labelled sample for the positive demonstration.
- **Unclear weather or missing arrival forecast:** Say the forecast is unavailable; do not substitute the illustrative 70% into a live result.
- **Time is short:** Do the route selection, sample slider at 3 then 4 minutes, and Show this route. Skip weather-layer settings and conversational planning.

## Optional 30-second extension

Open **Ask AI**, request “Waterloo to Bank,” resolve any station clarification, and show that the result uses the same map and route controls. Or choose **Weather** and inspect the bounded sampled field. These are optional; keep the core demo focused on stops and the walking decision.
