# Dry Run Plumbing: inbound AI voice agent demo

## What this is

A working AI receptionist for a fictional plumbing company, built as a portfolio and skills project. A stranger can call the number, role-play a plumbing problem, text a photo mid-call, get a preliminary quote and a booking, and receive a summary afterward. The plumbing persona is the costume; the product is a rules-driven agent that could wear any small-business intake process.

Two goals, both required:
1. Ray acquires production AI engineering skills (voice agents, tool calling, workflow orchestration, evals, observability).
2. A real, callable demo Ray can point to on his site, LinkedIn, and in interviews.

Ray is a product manager learning to code. He builds with Claude Code and acts as QA. Explain what you change and why, in plain language, every time. Prefer existing libraries over custom code. Ask before adding a dependency.

## Architecture: three layers, one loop

- Conversation layer: Retell runs the live call (speech to text, turn-taking, text to speech, tool calling). Claude Haiku handles turns. The rules file is loaded into the prompt at call start.
- Actions layer: n8n workflows. Every tool call from Retell and every Retell or Twilio webhook lands here. n8n calls Claude Sonnet for photo analysis and summaries (quotes are deterministic, from the rules file), and talks to Cal.com, HubSpot, Twilio SMS, and Supabase.
- Memory layer: Supabase (Postgres) for callers, calls, photos, quotes, bookings, follow-ups. The rules file (`rules/plumbing.yaml`) is versioned here in the repo. Langfuse holds traces.

The loop: rules load into the prompt, the agent calls a tool, n8n does the work and reads or writes Supabase, the result returns as the tool's response, the agent says it out loud.

## Stack

Twilio (Canadian number, SMS, MMS), Retell (built-in Claude Haiku, billed by Retell; BYOK is unsupported for the built-in LLM), Anthropic API (Haiku for turns, Sonnet for reasoning and vision), n8n Cloud, Supabase, Cal.com, HubSpot free CRM, Vercel + Next.js (landing page, later the quote page), Langfuse (traces), Promptfoo (evals), Retell simulation testing.

## Docs

Fetch current documentation before using a tool's API; don't work from memory.

- Retell: https://docs.retellai.com/llms.txt
- n8n: https://docs.n8n.io/llms.txt (workflows are pushed through the n8n MCP server)
- Cal.com: https://cal.com/docs/llms.txt
- Langfuse: https://langfuse.com/llms.txt, plus the vendored skill at `.claude/skills/langfuse/`
- Supabase: no llms.txt; use the official Supabase MCP server or https://supabase.com/docs
- Twilio: https://www.twilio.com/docs
- Anthropic API: the claude-api skill

## The spec

`docs/ideal-call.md` is the spec. It is the one call we want, written as a two-column transcript (what is said, what the system does), plus the ten beats an eval grades. Evals grade behaviour, not wording. `docs/emergency-call.md` is the second test case and defines the escalation path. Read both before touching the prompt, tools, or schema.

## Repo layout

```
CLAUDE.md
README.md
.env.example              every key named, no values; .env is gitignored
docs/
  architecture.md
  ideal-call.md
  emergency-call.md
  decisions.md            one entry per decision, dated, newest first, append only
  status.md               current step, next actions, blockers, open decisions; changes every session
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
  cases/                  ideal call, emergency, messy-caller variants
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
- At session start read `docs/status.md` and the last five entries of `docs/decisions.md`. Update `docs/status.md` before the session ends. Build progress, blockers, and open decisions live there, not here.

## Agent behaviour rules (from the ideal call review)

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

Verbal SMS consent before the first text of a call, word for word from `compliance.sms_consent_ask` in the rules file. It is registered with the carriers and published at nurgazy.com/dryrunplumbing/sms; those three must stay identical. The public privacy policy, terms, and opt-in pages are listed in `docs/compliance-pages.md`. `compliance.sms_footer` is still placeholder text and needs the real entity and mailing address before step 3 sends anything.
