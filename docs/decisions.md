# Decisions

One line per decision, dated, newest first. Non-obvious calls only.

- 2026-09-12 Evals and the Retell push share one rendering path (`evals/prompt.js` reads `agent/prompt.md` and injects `rules/plumbing.yaml`), so what is graded is what is deployed.
- 2026-09-12 Gas smell is handled as safety-only: instruction to leave and call the gas utility or 911, no intake, no escalation, because a plumber is not the first responder for gas.
- 2026-09-12 The opener is a static Retell begin message, not model-generated, so the recording and AI disclosures are verbatim every time.
- 2026-09-12 Prices in CAD and the fictional shop is in Vancouver, matching the Canadian Twilio number.
- 2026-09-12 Assume a solo shop with one on-call number until decided otherwise. The rules file has a `crew_model` field so the crew version is a config change, not a rewrite.
- 2026-09-12 Rules file is YAML with a JSON Schema alongside it, validated at push time and in evals, so a malformed rules file cannot reach Retell.
