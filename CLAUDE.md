# Dry Run Plumbing: inbound AI voice agent demo

## What this is

A working AI receptionist for a fictional plumbing company, built as a portfolio and skills project. A stranger can call the number, role-play a plumbing problem, text a photo mid-call, get a preliminary quote and a booking, and receive a summary afterward. The plumbing persona is the costume; the product is a rules-driven agent that could wear any small-business intake process.

Two goals, both required:
1. Ray acquires production AI engineering skills (voice agents, tool calling, workflow orchestration, evals, observability).
2. A real, callable demo Ray can point to on his site, LinkedIn, and in interviews.

Ray is a product manager learning to code. He builds with Claude Code and acts as QA. Explain what you change and why, in plain language, every time. Prefer existing libraries over custom code. Ask before adding a dependency.

## Architecture: three layers, one loop

- Conversation layer: Retell runs the live call (speech to text, turn-taking, text to speech, tool calling). Claude Haiku handles turns. The rules file is loaded into the prompt at call start.
- Actions layer: n8n workflows. Every tool call from Retell and every Retell or Twilio webhook lands here. n8n calls Claude Sonnet for photo analysis, quotes, and summaries, and talks to Cal.com, HubSpot, Twilio SMS, and Supabase.
- Memory layer: Supabase (Postgres) for callers, calls, photos, quotes, bookings, follow-ups. The rules file (`rules/plumbing.yaml`) is versioned here in the repo. Langfuse holds traces.

The loop: rules load into the prompt, the agent calls a tool, n8n does the work and reads or writes Supabase, the result returns as the tool's response, the agent says it out loud.

## Stack

Twilio (Canadian number, SMS, MMS), Retell (BYOK, Anthropic key), Anthropic API (Haiku for turns, Sonnet for reasoning and vision), n8n Cloud, Supabase, Cal.com, HubSpot free CRM, Vercel + Next.js (landing page, later the quote page), Langfuse (traces), Promptfoo (evals), Retell simulation testing.

## The spec

`docs/golden-call.md` is the spec. It is the one call we want, written as a two-column transcript (what is said, what the system does), plus the ten beats an eval grades. Evals grade behaviour, not wording. `docs/emergency-call.md` is the second test case and defines the escalation path. Read both before touching the prompt, tools, or schema.

## Repo layout

```
CLAUDE.md
README.md
.env.example              every key named, no values; .env is gitignored
docs/
  architecture.md
  golden-call.md
  emergency-call.md
  decisions.md            one line per decision, dated, newest first
rules/
  plumbing.yaml           the rules file: hours, on-call, urgency tiers, job types, price bands, escalation, follow-up cadence
  schema.json             what a valid rules file must contain
agent/
  prompt.md               Retell agent prompt; {{rules}} placeholder filled at push time
  tools.json              tool definitions: get_photo_analysis, send_quote, get_availability, book_slot, escalate
  push.ts                 builds prompt + rules and pushes the agent to Retell via API
workflows/                n8n exports, one JSON per workflow, committed after every change
supabase/migrations/      schema as SQL via Supabase CLI
evals/
  promptfooconfig.yaml
  cases/                  golden call, emergency, messy-caller variants
  fixtures/               the test photo
web/                      Next.js landing page (later)
```

## Conventions

- The repo is the source of truth. Retell, n8n, and Supabase are deploy targets. Push the agent from `agent/`, export n8n workflows to `workflows/` after every change, keep the schema in migrations.
- Secrets never enter the repo. `.env.example` lists every key by name.
- Plain TypeScript, plain folders, git. No monorepo tooling, no Docker, no CI until a milestone needs it.
- Every LLM call, in Retell or in n8n, emits a Langfuse trace.
- Prompt changes run the eval suite before being pushed.
- Record every non-obvious decision in `docs/decisions.md` in one line.

## Agent behaviour rules (from the golden call review)

- Open with the recording disclosure and the AI disclosure, verbatim.
- One question per turn on voice.
- Ask both triage questions (drip or running, can you reach the shutoff) before stating urgency.
- Explain why a photo helps before asking for it. Wait for the caller to confirm it is sent. If the tool returns nothing, say so and wait.
- Quote only inside the rules-file price band for the identified job type.
- Offer booking proactively right after the quote.
- Answer policy questions only from the rules file. Never invent policy.
- Close with the STOP opt-out line, verbatim.
- Emergencies: safety instruction first, then escalate. No photo, no quote.

## Compliance

Spoken recording disclosure. AI disclosure on request and in the opener. CASL opt-out on every text (STOP). Document US data routing (Retell, Anthropic, n8n, Supabase regions) in `docs/architecture.md`.

## Build order and status

1. Answer in character with disclosures, two triage questions, name and address. No tools. Tested via Retell web call. (current)
2. Photo loop: MMS in, vision, `get_photo_analysis` tool.
3. Quote via `send_quote`.
4. Booking via `get_availability` and `book_slot` (Cal.com).
5. After-call: summary, Supabase record, HubSpot, wrap-up SMS, scheduled follow-up.
6. Evals in Promptfoo and Retell simulation; Langfuse traces on every call.
7. Escalation (`escalate` tool, SMS channel only; other channels exist as config values).
8. Spam gate, knowledge-base Q&A, weekly report, landing page.

The eval set for a step is written before the step is built.

## Open decisions

- Is Dry Run Plumbing a one-person shop with one on-call number, or a small crew? Affects the availability model and the on-call section of the rules file.
- Twilio Canadian number is under regulatory review. Until it clears, test via Retell web calls.
