# n8n workflows

Each `*.sdk.ts` file is one n8n workflow written in the n8n Workflow SDK (n8n's
code form of a workflow). The repo copy is the source of truth; n8n is a deploy
target. Claude creates and updates the n8n copies through n8n's instance-level
MCP server (`N8N_MCP_URL` and `N8N_MCP_TOKEN` in `.env`), which works on the trial
plan where the classic API does not. Credentials are never in these files: each
node names a credential ("Twilio Dry Run", "Anthropic Dry Run", "Supabase Dry Run",
"Langfuse Dry Run") that is created by hand in the n8n editor.

| File | n8n workflow | Trigger | Step |
|---|---|---|---|
| inbound-photo.sdk.ts | Dry Run: inbound photo (p7DbdzNA9f9BSQf9) | Twilio inbound message webhook `/webhook/twilio-inbound-mms` | 2 |
| get-photo-analysis.sdk.ts | Dry Run: tool get_photo_analysis (TuGu1xSgZ68Srik1) | Retell custom function webhook `/webhook/tools/get-photo-analysis`; photos count from 5 min before the call started | 2 |
| send-quote.sdk.ts | Dry Run: tool send_quote (qWT50n728T002f3t) | Retell custom function webhook `/webhook/tools/send-quote` | 3 |

`analyze-photo.prompt.md` is the vision system prompt, kept here so it can be
read and evaluated; the same text is embedded in inbound-photo.sdk.ts and must be
kept identical by hand for now.

Values from `rules/plumbing.yaml` (job types, price bands, the service call fee,
the SMS footer) are rendered into the workflows by `node workflows/build.js`,
between `/* BEGIN generated ... */` and `/* END generated */` markers inside a
Code node. Run it after any rules change; `node workflows/build.js --check`
fails if a copy is stale. Then push the changed workflow to n8n.

If a workflow is edited in the n8n editor instead of here, that edit is lost on
the next push from the repo. Edit here, then ask Claude to push.
