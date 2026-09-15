# Architecture

Three layers, one loop. See CLAUDE.md for the short version.

## Layers

Conversation: Retell runs the live call (speech to text, turn-taking, text to speech, tool calling). Claude 4.5 Haiku handles turns through Retell's built-in LLM, billed by Retell. Retell does not support bring-your-own-key for its built-in LLM; using our own Anthropic key would mean running a custom LLM websocket server, which is not worth it for this demo. The Anthropic key is used directly by n8n and by the evals. The rules file is rendered into the prompt at push time, not fetched at call time.

Actions: n8n Cloud. Every Retell tool call and every Retell or Twilio webhook lands on an n8n webhook. n8n calls Claude Sonnet for photo analysis and summaries, builds quotes from the rules file with no model, and talks to Cal.com, HubSpot, Twilio SMS, and Supabase.

Memory: Supabase Postgres. Tables: callers, calls, photos, quotes, bookings, escalations, follow-ups. Langfuse holds traces.

## The loop

1. Rules load into the prompt.
2. The agent calls a tool.
3. n8n does the work and reads or writes Supabase.
4. The result returns as the tool's response.
5. The agent says it out loud.

## Webhooks into n8n

- Retell call-started: look up or create the caller row, open the call row.
- Retell call-ended: summary via Sonnet, finalize call row, HubSpot contact and deal, wrap-up SMS, schedule follow-up.
- Twilio inbound MMS: pull the image, run Sonnet vision, store the structured result on the photos table keyed by phone number and time.

## Tools (Retell custom functions, each an n8n webhook)

- `get_photo_analysis`: returns the latest photo result for this caller, or nothing.
- `send_quote`: picks the price band from the rules file for the job type (rendered into the workflow by `workflows/build.js`), sends the SMS from a fixed template, stores the quote. One per call.
- `get_availability`: asks Cal.com for open slots by urgency.
- `book_slot`: creates the Cal.com booking, sends the confirmation SMS.
- `escalate`: texts the on-call number, stores the escalation, returns confirmation.

Definitions live in `agent/tools.json`.

## Data routing

Caller audio, transcripts, phone numbers, addresses, and photos leave Canada. Each region below is to be confirmed against the vendor's account settings before the number goes live, then recorded here with a date.

- Twilio: number is Canadian; media and message logs stored in Twilio's US infrastructure. [to confirm]
- Retell: US-hosted. [to confirm]
- Anthropic API: US-hosted. [to confirm]
- n8n Cloud: region chosen at signup. [to confirm which]
- Supabase: region chosen at project creation. [to confirm which]
- Cal.com, HubSpot, Langfuse: [to confirm]

Compliance summary: spoken recording disclosure in the opener, AI disclosure in the opener and on request, CASL opt-out (STOP) on every text.

Public privacy policy and terms, required for Twilio A2P campaign registration, are at
nurgazy.com/dryrunplumbing/privacy and /terms. See `docs/compliance-pages.md`.

## Observability

Every LLM call, in Retell or in n8n, emits a Langfuse trace tagged with the Retell call ID so a whole call can be read as one trace.
