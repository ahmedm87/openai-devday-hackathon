# Frontend feedback handoff — 1 November 2026

This records the earlier sidebar design. The current interface and checks are described in the [map-first handoff](MAP_FIRST_HANDOFF.md).

The feedback in `frontend_codex_handoff.md` has been applied on `codex/live-integration`. The first implementation is in `7a4895e`; the follow-up improves map click targets and mobile forecast readability. No backend schema or dependency changes were needed.

## What changed

- A 360px desktop sidebar sits beside a sticky map. The header is compact, and both station selectors and Find button fit in the checked 1280×800 viewport.
- Chat keeps its composer visible. Conversation history starts collapsed, opens for requests and clarification/errors, and retains station choices, clear/history and same-journey refinement.
- Guided and conversational searches share busy state and authoritative journey/preference state.
- The recommendation appears directly below its numbered recommended card. Selecting another option changes the map, status and steps while keeping that explanation attached to the recommendation. The full returned summary and first two trade-offs remain visible; further context uses a keyboard-accessible disclosure.
- All returned route geometry is drawn, with muted alternatives, selected layers above them and dashed walking legs. Thin paths have a larger selection target. Missing geometry is not joined across gaps.
- Endpoint forecast markers show returned temperature and rain probability. Desktop details use a popup; mobile details use an inline panel beneath the map so timestamps and source cannot be clipped by the short map.
- Selected-route status uses returned descriptions, line names, reasons and retrieval time. Status descriptions remain visible while its details are collapsed.
- Mobile uses one set of controls/chat in the order controls → map → chat → routes → expanded evidence. Maps are 290–310px tall at the checked narrow widths, editable fields use 16px text, and numbered empty-state rows use a fixed 2rem column.

## Verification

- Existing backend suite: **20 passed** locally.
- Vite production build passed. The existing large MapLibre bundle warning remains; bundle splitting was outside this layout change.
- Live Waterloo Underground → Bank Underground: real route cards, endpoint forecast values/hour/retrieval/source, selected-route status/reasons and recommendation limitations checked in Chrome.
- Card selection changes selected details without moving the recommendation to the alternative.
- Clicking the sample walking path selects Option 3, updates selected details and keeps “Why we recommend Option 1”.
- Chat “Waterloo to Bank” asks which Bank station; choosing Bank Underground updates the guided selectors/cards/map. “Same journey with fewer changes” updates the preference and routes. A single map canvas remains present.
- An isolated localhost fixture intentionally disabled weather, line status, explanations and chat. Real journey cards remained available, missing-provider warnings were visible and chat errors expanded the conversation. The fixture server was stopped afterward.
- Keyboard activation checked for conversation, station choices, recommendation/status disclosures and forecast controls.
- Actual CSS viewport 1280×800 checked. Mobile 320×844, 389×844 and 391×844 checked without horizontal document overflow. The 390px target was bracketed at 389/391px because the browser’s existing zoom rounds the integer viewport override.
- Mobile forecast panel: the complete forecast hour, retrieval/sample label, values and source fit below the map. Changing preference while this panel is open clears the old forecast and returns to the empty state without a browser error. Numbered labels remain aligned at both narrow widths, with one form and one chat instance.

## Review and handoff

Pull `codex/live-integration` and rebuild `frontend` before restarting the local FastAPI app. The preview is http://127.0.0.1:8000/.

Screenshots are local under `artifacts/waywise-frontend-feedback-2026-11-01/`; they are not committed. Sample screenshots are explicitly fictional. The implementation remains on the integration branch for review.

Physical touch-device and screen-reader walkthroughs remain unverified. Hosting is still preparation only; there has been no merge to main or hosted publication for this change.
