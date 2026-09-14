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
| get-photo-analysis.sdk.ts | Dry Run: tool get_photo_analysis (TuGu1xSgZ68Srik1) | Retell custom function webhook `/webhook/tools/get-photo-analysis` | 2 |

`analyze-photo.prompt.md` is the vision system prompt, kept here so it can be
read and evaluated; the same text is embedded in inbound-photo.sdk.ts and must be
kept identical by hand for now.

If a workflow is edited in the n8n editor instead of here, that edit is lost on
the next push from the repo. Edit here, then ask Claude to push.
