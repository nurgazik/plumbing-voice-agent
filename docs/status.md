# Status

The one file that changes every session. Read it at session start; update it before ending. Stable facts live in `CLAUDE.md`; the why behind choices lives in `docs/decisions.md`.

## Current step

Step 2, photo loop. Backend done and verified live 2026-09-13. Remaining: eval cases, prompt update, tool wired into the Retell agent.

## Build order

The eval set for a step is written before the step is built.

1. Answer in character with disclosures, two triage questions, name and address. No tools. Done, 38/38 evals.
2. Photo loop: MMS in, vision, `get_photo_analysis` tool. In progress. Done: Twilio posts to n8n, Sonnet vision, Supabase `photos` row, Langfuse trace, tool webhook answers. Not done: step 2 eval cases (design proposed, awaiting yes), prompt update from "no tools" to the photo flow, tool wired into the Retell agent. See `workflows/README.md` and `docs/decisions.md` 2026-09-13 entries.
3. Quote via `send_quote`.
4. Booking via `get_availability` and `book_slot` (Cal.com).
5. After-call: summary, Supabase record, HubSpot, wrap-up SMS, scheduled follow-up.
6. Evals in Promptfoo and Retell simulation; Langfuse traces on every call.
7. Escalation (`escalate` tool, SMS channel only; other channels exist as config values).
8. Spam gate, knowledge-base Q&A, weekly report, landing page.

## Next actions

- Step 2 eval cases: Ray to say yes to the proposed design, then write them.
- Update `agent/prompt.md` from "no tools" to the photo flow.
- Wire `get_photo_analysis` into the Retell agent and push.

## Blockers

None. The A2P 10DLC campaign (brand 1260794 B.C. LTD, Dry Run Plumbing named as the product, not a DBA) was approved 2026-09-13, so SMS and MMS are unlocked. Twilio credentials live in `.env`.

## Owed before later steps

- `compliance.sms_footer` needs the real entity and mailing address before step 3 sends anything.
- SMS consent eval case, owed at step 3.
- 90-day deletion job for recordings, transcripts, and photos, owed once Supabase holds real data.
- Langfuse tags nit: `langfuse.trace.tags` lands in raw attributes; fix with the next workflow change.

## Open decisions

- One-person shop with one on-call number, or a small crew? Assumed solo for now (`crew_model` in the rules file). Affects the availability model and the on-call section of the rules file.
