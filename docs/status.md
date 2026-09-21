# Status

The one file that changes every session. Read it at session start; update it before ending. Stable facts live in `CLAUDE.md`; the why behind choices lives in `docs/decisions.md`.

Last updated 2026-09-21. The build is still paused at step 3; the work since has been packaging it as a portfolio piece, not extending the agent.

## Open right now: publishing

Two outputs, both built and committed locally, neither published. See the 2026-09-21 entries in `docs/decisions.md`.

1. **This repo goes public** as `github.com/nurgazik/plumbing-voice-agent`, MIT. README rewritten for a stranger, `LICENSE` added, `docs/architecture.svg` and `docs/evals.svg` embedded. Not yet pushed: no git remote exists, and creating a public repo is Ray's call. The mailing address in `rules/plumbing.yaml` ships with it, decided deliberately.
2. **Case study** at `nurgazy.com/work/dry-run-plumbing`, committed in `~/Developer/portfolio_site` (`be52e0b`), not deployed. Leads with a real call recording as a two-channel waveform; adds `audio` and `callout` section types and a click-to-reveal for the demo number.

Owed before the page is public, all in the Retell dashboard: auto recharge **off** with a fixed float (this is the only hard spend cap), `Allowed Inbound Countries` US and CA, concurrency down from the default 20.

Not yet verified by a human: the waveform actually rendering, and the page at phone width. Headless Chrome cannot decode audio, so both need a real browser.

## Where things stand

Steps 1 to 3 are live on the phone number and each has been verified by real calls. A stranger can call +1 778 654 6764, describe a plumbing problem, be triaged, text a photo mid-call, hear what the photo shows, say yes to texts, and receive a preliminary quote by SMS. Emergencies get the safety instruction, intake, and the 15-minute callback line. Nothing is booked and no one is actually notified yet (steps 4 and 7).

- Eval suite: 46 cases in `evals/cases/`, each run twice, 92 results, all passing on the deployed prompt (last full run 2026-09-16, 91/92 with the one miss a rubric wording since fixed). One case lives outside the gate in `evals/known-limitations/` (opener cut off by the caller; solved at the Retell layer instead).
- Deploy state: Retell agent and LLM match the repo (push.ts verifies). n8n has three workflows live, all matching `workflows/*.sdk.ts`. Supabase has migrations 0001 to 0003 applied. Voice cartesia-Bing, opener delay 800 ms, interruption sensitivity 0.5.
- Cost: about $0.12 per call minute on Retell, under a cent per photo on Anthropic, a few cents per quote text on Twilio. A full eval run is about $1 on Anthropic (Haiku answers with the whole rules file in every prompt, Sonnet grading). Eval runs happen only with Ray's explicit go.

## Build order

The eval set for a step is written before the step is built.

1. Intake and triage, no tools. Done 2026-09-12.
2. Photo loop: MMS in, Sonnet vision, `get_photo_analysis`. Done 2026-09-14, verified by a real call.
3. Quote via `send_quote` by SMS, consent asked first. Done 2026-09-15, verified by real calls. Plus, same days: re-triage from caller answers plus photo (`triage.after_photo`), emergency fixes from three real emergency calls, honest close lines, photo window from call start.
4. Booking via `get_availability` and `book_slot` (Cal.com). Not started.
5. After-call: summary via Sonnet, `calls` row, HubSpot, wrap-up SMS, scheduled follow-up. Not started.
6. Evals in Promptfoo and Retell simulation; Langfuse traces on every call. Promptfoo done and gating every push; Langfuse covers the n8n vision call only (Retell's built-in Haiku cannot reach Langfuse, no BYOK). Retell simulation not started.
7. Escalation (`escalate` tool, SMS to the on-call number). Not started. Until then the emergency callback promise is unbacked: nobody is notified.
8. Spam gate, knowledge-base Q&A, weekly report, landing page. Not started.

## How to resume

1. Read this file, then the 2026-09-15 and 2026-09-16 entries in `docs/decisions.md` (there are many; they hold the lessons, especially: when the prompt and the rules file disagree the model follows the rules file; quote required lines literally in the prompt; every real defect gets a code check in the evals).
2. `node agent/push.ts --dry-run` confirms the repo renders and the rules validate without touching anything.
3. To change the agent: edit `agent/prompt.md` or `rules/plumbing.yaml`, write the eval case first in `evals/cases/`, get Ray's go for a run, then `npm run push` (runs the suite, deploys only on green). Rules changes also need `node workflows/build.js` and a push of the changed workflow to n8n through the MCP server (see `workflows/README.md`).
4. `node evals/coverage.js` shows which beats have cases. Beats IC-7, IC-10, EC-7, EC-9 have none because their steps are not built.

## Next step when work resumes: step 4, booking

Proposal to bring first (not yet discussed with Ray): eval cases for offering two windows right after the quote (beat IC-7), `get_availability` and `book_slot` as n8n workflows against Cal.com (API key and event type id are in `.env`), a `bookings` table, the confirmation text the consent script already promises. Decisions inside it: whether offered windows come from the rules file's arrival windows or Cal.com's real calendar; solo versus crew (`crew_model` in the rules, assumed solo). Alternative Ray floated: pull the step 5 wrap-up text forward if the "summary after the call" moment matters more to the demo than the appointment.

## Backlog (small, not blocking)

- The apartment branch of the emergency path (building-management line) has cases but has not been exercised on a real call.
- The re-triage raise (valve will not close plus a supply-side photo) has cases but has not been exercised on a real call.
- The prompt is about 35,000 characters, roughly 10,000 tokens per turn. Retell adds an "llm_token_surcharge" for it. Trimming is the cost lever if it ever matters.
- Prompt caching for the eval suite would cut the Haiku line about 80%; not checked whether promptfoo's Anthropic provider can mark the system prompt cacheable.
- Address clarification and photo follow-up are capped at one or two questions in the prompt; Ray's view is that complete data matters more than the count.
- Langfuse nit: `langfuse.trace.tags` lands in raw attributes; fix with the next workflow change.
- Retell deprecated `GET /list-agents` (use `POST /v2/list-agents`). Nothing in the repo calls it.

## Owed before later steps

- Step 5: the summary text needs consent too, so the consent question must move before the close for callers who got no quote. The after-quote close says "I've texted you the quote" until a real summary is sent; then it can promise the summary again.
- Step 5: the observability join. One `calls` row per call (Retell call id, transcript, recording link, cost, tokens, latency) with photos, quotes, bookings pointing at it; Langfuse traces grouped per call by the Retell call id.
- 90-day deletion job for recordings, transcripts, and photos, promised on the public privacy page; owed once Supabase holds real data.

## Blockers

None. A2P campaign approved 2026-09-13. Anthropic credits were topped up 2026-09-15; an empty balance stops both the evals and the n8n vision call, since they share the key.

## Open decisions

- One-person shop with one on-call number, or a small crew? Assumed solo (`crew_model` in the rules file). Affects the availability model at step 4 and the on-call section of the rules file.
- Prompt versus telephony for compliance lines: settled for the opener (Retell settings). Keep the pattern: anything that must be said verbatim is protected by structure, not by asking the model nicely.
