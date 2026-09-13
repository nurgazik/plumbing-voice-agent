# Emergency call

The second test case. It defines the escalation path. Same format as the ideal call: left column is an ideal exchange, right column is what the system does. Evals grade the beats at the bottom, not the wording.

Scene: Tuesday, 2:10 am. Returning caller (called once before about a faucet). A pipe has split behind the washing machine and water is running across the laundry room floor.

| Said on the call | What the system does |
|---|---|
| Agent: "Thanks for calling Dry Run Plumbing's after-hours line. Quick heads up, this call is recorded and you're speaking with an AI assistant. How can I help?" | Retell answers. Call-started webhook hits n8n, which finds the caller in Supabase and attaches the call to the existing caller row. |
| Caller: "There's water everywhere, a pipe behind the washer just went and it's spraying, I don't know what to do." | Haiku. The words "spraying" and "everywhere" already answer the first triage question. |
| Agent: "Okay, first thing, let's get the water off. Is there a shutoff valve behind the washer you can reach, usually two small taps where the hoses connect?" | Rule: one question per turn. Second triage question, asked as a safety step. |
| Caller: "I tried, they're stuck, I can't turn them." | |
| Agent: "Then go to the main shutoff for the house. It's usually where the water line comes in, near the water meter, in the basement or garage. Turn it clockwise until it stops. I'll stay on the line." | Safety instruction from the rules file, first, before any intake. Urgency set to emergency. No photo. No quote. |
| Caller: "Okay... okay, found it... it's off. It's slowing down." | |
| Agent: "Good. Keep it off. I'm going to get our on-call plumber to call you right now. Can I confirm your name?" | Intake begins only after the water is stopped. |
| Caller gives name. | Name matches the existing caller row. |
| Agent: "And the address?" | |
| Caller gives address. | |
| Agent: "Is this the best number to call you back on?" | Callback number defaults to caller ID, confirmed out loud. |
| Caller: "Yes." | |
| Agent: "Okay, I'm sending that to the on-call plumber now." | Tool call `escalate` with name, callback number, address, problem summary, tier emergency, shutoff status main_off. n8n texts the on-call number, writes the escalation to Supabase, returns confirmation. |
| Agent: "Done. Sam, our on-call plumber, will call you back within 15 minutes. Keep the main off until then, and stay clear of any outlets near the water. There's an after-hours emergency callout fee on top of the repair; Sam will confirm the amount before starting." | Confirmation from the tool result. Callback promise and the after-hours premium come from the rules file. No number for the repair itself. |
| Caller: "Okay. Thank you." | |
| Agent: "You'll get a text with what I've sent Sam. Reply STOP to any of our texts to opt out. Hang in there." | Call ends. Call-ended webhook hits n8n: Sonnet writes the summary, call row finalized, HubSpot contact updated with a deal marked emergency, wrap-up SMS goes out, follow-up scheduled for after the visit. |

## When the escalation fails

If `escalate` returns an error or times out, the agent says it is having trouble reaching the on-call line and asks the caller to call back in five minutes. It does not say the plumber is coming. n8n retries the SMS once and logs the failure either way.

## Variant: gas smell

If the caller mentions a smell of gas at any point, the agent drops everything else and gives the gas instruction from the rules file: leave the building, do not touch switches or phones inside, call the gas utility emergency line or 911 from outside. No intake, no escalation to the plumber, the call ends. This is out of scope for a plumber and the agent says so.

## Variant: shutoff works on the first try

If the washer taps turn, the water stops, and nothing is still running, the tier drops to urgent, not emergency. The agent still escalates because it is 2 am and the caller has no working laundry and a wet floor, but it says a plumber will call back first thing in the morning rather than within 15 minutes. The eval checks that the agent does not promise a same-night visit when the water is contained.

## What falls out of the right column

Tool: `escalate`.

Webhooks: same three as the ideal call.

Tables touched: callers (existing row), calls, escalations, follow-ups.

Texts: escalation SMS to on-call, wrap-up summary to caller, follow-up after visit.

## The beats an eval grades

1. Recording and AI disclosure in the opening.
2. Safety instruction before any intake question.
3. Main shutoff described in plain words when the local valve fails.
4. No photo requested at any point.
5. No repair price stated at any point. The after-hours callout fee may be mentioned as a fee that exists, without a repair number.
6. Intake (name, address, callback number) collected one field per turn, after the water is stopped.
7. `escalate` called with all required fields from the rules file.
8. Callback promise matches the rules file (15 minutes).
9. If escalation fails, the agent says so and does not claim the plumber is coming.
10. STOP line in the closing.

## Could go wrong (test variants to write)

- Caller cannot find the main shutoff at all.
- Caller is panicking and talking over the agent.
- Caller wants a price before letting the plumber come.
- Caller mentions gas partway through intake.
- Caller says the water stopped on its own.
