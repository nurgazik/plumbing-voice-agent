# Decisions

One line per decision, dated, newest first. Non-obvious calls only.

- 2026-09-13 The consent ask is ~60 words, well over the 40-word turn budget, because A2P vetting rejected the short version: the spoken script itself has to name the business, the message types, the frequency, the rates disclaimer, and STOP. Treated like a safety instruction, exempt from the budget.
- 2026-09-13 The agent asks for verbal SMS consent before the first text of a call, word for word from `compliance.sms_consent_ask`, and sends nothing on a no. Twilio's A2P checker rejected the campaign for claiming verbal opt-in with no script on file, and the claim was in fact aspirational: nothing in the prompt or rules ever asked. The eval case is owed at step 3, when the first text actually sends.
- 2026-09-13 Privacy policy and terms live in the portfolio site repo at nurgazy.com/dryrunplumbing/privacy and /terms, not in `web/`, because the A2P brand is registered to Ray personally and a matching domain reads better to a vetting reviewer. `docs/compliance-pages.md` has the pointer.
- 2026-09-13 The public pages promise 90-day deletion of recordings, transcripts, and photos. That is a commitment with no implementation yet; a deletion job is owed in the n8n layer once Supabase is live.
- 2026-09-12 Retell's built-in Claude 4.5 Haiku, billed by Retell, instead of BYOK. Retell support confirms BYOK is unsupported for the built-in LLM; the alternative is a custom LLM websocket server, which is out of scope. CLAUDE.md's "BYOK" line should be updated.
- 2026-09-12 The opener is a literal string in `agent/settings.json` (Retell begin_message), checked at push time for the words "recorded" and "AI assistant", so the disclosures are verbatim and cannot drift with the prompt.
- 2026-09-12 push.ts has no dependencies and runs on Node's built-in TypeScript support; schema validation of the rules file is skipped until js-yaml and ajv are added as devDependencies (asked, not added).
- 2026-09-12 Voice is cartesia-Emily (calm, middle-aged, American) as a starting point; change it in `agent/settings.json`.
- 2026-09-12 Agent temperature is 0.1, set in `agent/settings.json` and mirrored in the eval config. At 0.3 the suite hovered between 94 and 100% run to run; steadier turns matter more than variety on a phone call. Ray confirmed.
- 2026-09-12 Keep the phone price band (photo to quote loop) over the industry fee-only script. Ray confirmed; the fee-first framing in `pricing_policy` makes it defensible.
- 2026-09-12 Rules file v2 is grounded in a survey of Metro Vancouver shops, dispatch scripts, and BC regulators; see `docs/plumbing-research.md`. Values are fictional but shaped like the real thing.
- 2026-09-12 Keep the phone price band even though no real shop quotes one; the agent now leads with the service call fee and calls the band a typical range confirmed on site, which is the honest middle and satisfies BC's estimate rule.
- 2026-09-12 Dry Run is deliberately not a gas contractor. Many Vancouver plumbers are, but it keeps the demo's escalation path single-purpose. Gas smell uses FortisBC's wording and number.
- 2026-09-12 Weekend booked visits run at the regular rate, because the ideal call books a Sunday morning and says so; the v1 rules had Sunday closed, which contradicted the spec.
- 2026-09-12 The agent may state fees (service call, after-hours callout) on request but never a repair number in step 1; the firm-price eval allows the digits 120 only.
- 2026-09-12 Every eval case runs twice at the real temperature (0.3), because the first single-pass run hid three real agent gaps that only showed on a second roll. A flaky turn is a failing turn.
- 2026-09-12 Callback promise is a per-tier `callback` line in the rules file, after the first eval run caught the agent promising the emergency-only 15-minute callback for a routine drip.
- 2026-09-12 Policy values in the rules file are written as plain sentences, not bare tokens (`weekend_surcharge: "None. ..."` rather than `none`), because Haiku read the bare token as "no information".
- 2026-09-12 The eval word budget is a per-case var (`max_words`, default 70) so safety instructions and price refusals can run longer without loosening the limit for ordinary turns.
- 2026-09-12 Evals and the Retell push share one rendering path (`evals/prompt.js` reads `agent/prompt.md` and injects `rules/plumbing.yaml`), so what is graded is what is deployed.
- 2026-09-12 Gas smell is handled as safety-only: instruction to leave and call the gas utility or 911, no intake, no escalation, because a plumber is not the first responder for gas.
- 2026-09-12 The opener is a static Retell begin message, not model-generated, so the recording and AI disclosures are verbatim every time.
- 2026-09-12 Prices in CAD and the fictional shop is in Vancouver, matching the Canadian Twilio number.
- 2026-09-12 Assume a solo shop with one on-call number until decided otherwise. The rules file has a `crew_model` field so the crew version is a config change, not a rewrite.
- 2026-09-12 Rules file is YAML with a JSON Schema alongside it, validated at push time and in evals, so a malformed rules file cannot reach Retell.
