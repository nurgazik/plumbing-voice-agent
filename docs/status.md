# Status

The one file that changes every session. Read it at session start; update it before ending. Stable facts live in `CLAUDE.md`; the why behind choices lives in `docs/decisions.md`.

## Current step

Step 3, quote by SMS. Built 2026-09-14: 7 eval cases (`evals/cases/quote.yaml`), prompt with consent-then-quote, `quotes` table (migration 0003), n8n `send_quote` workflow (deterministic, band from the rules via `workflows/build.js`), footer with the real entity and address, pushed to Retell. Suite 68/68. Remaining: a real call where Ray says yes to consent and receives the text; the postal code for the footer.

Step 2 history: photo loop. Backend verified live 2026-09-13. Eval cases written and the prompt updated to the photo flow 2026-09-14; suite green (54/54). Pushed to Retell 2026-09-14 with `get_photo_analysis` wired to n8n. Twilio number connected to Retell over a SIP trunk 2026-09-14 (trunk TKa13bad50ff656a7f39aa3c41b274ff1c, Retell number type custom, bound to the agent; `sms_url` still the n8n MMS webhook). First real call 2026-09-14 20:50 UTC: full flow worked, photo used live, photo row stamped with the call id. Step 2 done pending the backlog items below.

## Build order

The eval set for a step is written before the step is built.

1. Answer in character with disclosures, two triage questions, name and address. No tools. Done, 38/38 evals.
2. Photo loop: MMS in, vision, `get_photo_analysis` tool. In progress. Done: Twilio posts to n8n, Sonnet vision, Supabase `photos` row, Langfuse trace, tool webhook answers, eval harness passes the tool to Haiku and replays tool results, 8 photo cases in `evals/cases/photo.yaml`, `build_step` is 2. Prompt updated to the photo flow, 54/54, pushed, verified by a real call (Retell call_3eb9dae49c898b7faa8ada35fe6, 2m15s, 27.4 cents on Retell plus 0.9 cents Sonnet vision per photo). Done. See `workflows/README.md` and `docs/decisions.md` 2026-09-13 and 2026-09-14 entries.
3. Quote via `send_quote`. Built 2026-09-14, awaiting the live-call check.
4. Booking via `get_availability` and `book_slot` (Cal.com).
5. After-call: summary, Supabase record, HubSpot, wrap-up SMS, scheduled follow-up.
6. Evals in Promptfoo and Retell simulation; Langfuse traces on every call.
7. Escalation (`escalate` tool, SMS channel only; other channels exist as config values).
8. Spam gate, knowledge-base Q&A, weekly report, landing page.

## Next actions

- Live step 3 call: Ray calls, sends the sink photo, says where the drip is, hears the consent script, says yes, and should receive one text with the quote. Then check the `quotes` row (sms_status sent, consent_recorded_at set) and Retell's tool call record. Also confirm the vision workflow still analyzes a fresh photo after its node swap.
- Ray to send the postal code for the SMS footer (`business.mailing_address` and `compliance.sms_footer`), then `node workflows/build.js`, push send_quote to n8n, and push the agent.
- Backlog from the first call: the prompt caps address clarification at one question and photo follow-up at one; Ray's view is that complete data matters more than the count, so relax the caps to "one question per turn, stop when complete". Not changed yet.
- Observability join, owed at step 5: one `calls` row per call (Retell call id, transcript, recording link, cost, tokens, latency) with photos, quotes, bookings pointing at it; Langfuse traces grouped per call by the Retell call id. Retell's built-in Haiku turns cannot reach Langfuse (no BYOK); they live in Retell's dashboard and public log only.
- Real phone call with a photo, then confirm the Langfuse trace and the `photos.retell_call_id` stamp.

## Blockers

None. The A2P 10DLC campaign (brand 1260794 B.C. LTD, Dry Run Plumbing named as the product, not a DBA) was approved 2026-09-13, so SMS and MMS are unlocked. Twilio credentials live in `.env`.

## Owed before later steps

- `compliance.sms_footer` needs the real entity and mailing address before step 3 sends anything.
- At step 5 the summary text needs consent too; the consent question will have to move before the close for callers who got no quote. Decide then.
- 90-day deletion job for recordings, transcripts, and photos, owed once Supabase holds real data.
- Langfuse tags nit: `langfuse.trace.tags` lands in raw attributes; fix with the next workflow change.
- Retell deprecated `GET /list-agents` (replacement `POST /v2/list-agents`, filter by channel, paged). Nothing in the repo calls it; a one-off curl on 2026-09-12 triggered the notice. Use the v2 endpoint for any future check.

## Open decisions

- One-person shop with one on-call number, or a small crew? Assumed solo for now (`crew_model` in the rules file). Affects the availability model and the on-call section of the rules file.
