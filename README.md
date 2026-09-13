# Dry Run Plumbing

An AI receptionist for a fictional plumbing company. Call the number, describe a plumbing problem, text a photo mid-call, get a preliminary quote and a booking, and receive a summary afterward.

The plumbing persona is the costume. The product is a rules-driven intake agent that could wear any small-business process.

Built with Retell, Claude, n8n, Supabase, Twilio, Cal.com, and HubSpot. Evals in Promptfoo, traces in Langfuse.

Start with `CLAUDE.md` for the shape of the project, `docs/ideal-call.md` for the one call we want, and `docs/emergency-call.md` for the escalation path.

## Pushing the agent to Retell

```
node agent/push.ts --dry-run   # render, validate, show payloads
node agent/push.ts             # render, validate, run evals, push
```

Needs `RETELL_API_KEY` in `.env`. The first push creates the Retell LLM and agent and saves their ids to `.env`; later pushes update them in place. The push refuses to deploy if the eval suite fails. Model, temperature, voice, and the opener live in `agent/settings.json`.

## Running the evals

```
cp .env.example .env   # fill in ANTHROPIC_API_KEY
cd evals
npx promptfoo@latest eval
npx promptfoo@latest view
```
