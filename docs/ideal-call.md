# Ideal call

The one call we want. Not a script the agent recites. The left column shows an ideal exchange; the right column shows what the system does at that moment. Evals grade the ten beats at the bottom, not the wording.

Scene: Saturday, 9:40 pm. First-time caller. Slow leak under a kitchen sink. Routine job with a photo.

| Said on the call | What the system does |
|---|---|
| Agent: "Thanks for calling Dry Run Plumbing's after-hours line. Quick heads up, this call is recorded and you're speaking with an AI assistant. How can I help?" | Retell answers. Call-started webhook hits n8n, which looks the number up in Supabase, finds nothing, creates a caller row. Rules file is already in the prompt. |
| Caller: "Uh, yeah, hi. So there's water dripping under my kitchen sink, I've got a bucket under it right now." | Haiku, conversation only. |
| Agent: "Sorry to hear that. Is it a slow drip, or is water actually running?" | Rule: one question per turn. First triage question. |
| Caller: "It's a drip. Like, a steady drip, but not pouring or anything." | |
| Agent: "Okay. Is there a shutoff valve under the sink you can reach?" | Second triage question. |
| Caller: "Yeah, I already turned it, it slowed down a lot." | |
| Agent: "Good, that takes it out of emergency territory, so nobody needs to come out tonight. Can I get your name?" | Urgency set to routine. Intake fields collected one at a time. |
| Caller gives name. | |
| Agent: "And the address where the sink is?" | |
| Caller gives address. | |
| Agent: "Thanks. If you can text a photo of the leak to this same number, I can take a look right now and give you a rough idea of the cost before anyone comes out. Take your time, just let me know once it's sent." | Rule: explain why the photo helps. Nothing happens yet. |
| Caller: "Oh, okay, give me a sec... yeah... okay, sent it." | |
| Agent: "Got it, one moment while I take a look." | Tool call `get_photo_analysis`. Twilio's MMS webhook already hit n8n, which pulled the image, ran Sonnet vision, and stored a structured result in Supabase. If the tool returns nothing yet, the agent says it hasn't come through and waits, then retries. |
| Agent: "That looks like the joint at the P-trap, the curved pipe under the drain. Very common, nothing dangerous, just keep the valve off tonight. Do you know roughly how old the plumbing under there is?" | Photo result used live. Example line, not a fixed one. |
| Caller: "No idea honestly, we bought the house last year." | |
| Agent: "No problem. A repair like this usually runs $250 to $400, depending on whether the trap needs replacing. I can text the quote and the appointment details to this number. Standard message and data rates may apply, and you can reply STOP any time. Is that okay?" | Rule: verbal SMS consent, asked once, before the first text of the call. The `sms_consent_ask` line from the rules, word for word. The recording is the record of consent, which is what carriers ask for at A2P registration. On a no, nothing is sent all call. |
| Caller: "Yeah, that's fine." | |
| Agent: "Great, sending it now, and I can get someone booked while we're on the line. Let me check the schedule." | Tool call `send_quote` with job type, severity, summary. n8n picks the band from the rules file, sends the SMS, stores the quote. Then tool call `get_availability` with urgency routine; n8n asks Cal.com for open slots. |
| Agent: "I've got tomorrow between 9 and 11, or Monday between 1 and 3. Either work?" | Rule: offer booking proactively after the quote. |
| Caller: "Tomorrow morning is good." | |
| Agent: "Booked, tomorrow 9 to 11. You'll get a confirmation text in a second." | Tool call `book_slot`. Cal.com creates the booking, n8n sends the confirmation SMS. |
| Caller: "Oh, is there a weekend surcharge or anything?" | |
| Agent: "No, Sunday morning is our regular rate. The only premium is for after-hours emergency callouts." | Answered from the rules file, no tool call. |
| Agent: "You're all set. I'll text a summary with the quote and booking. Reply STOP to any of our texts to opt out. Good night." | Call ends. Call-ended webhook hits n8n: Sonnet writes the summary, Supabase call row is finalized, HubSpot gets a contact and a deal, wrap-up SMS goes out, a follow-up is scheduled for after the visit. |

## What falls out of the right column

Tools: `get_photo_analysis`, `send_quote`, `get_availability`, `book_slot`. Plus `escalate` from the emergency call.

Webhooks into n8n: Retell call-started, Retell call-ended, Twilio inbound MMS.

Tables: callers, calls, photos, quotes, bookings, follow-ups.

Texts: preliminary quote, booking confirmation, wrap-up summary, scheduled follow-up.

## The ten beats an eval grades

1. Recording and AI disclosure in the opening.
2. One question per turn.
3. Both triage questions asked before urgency is stated.
4. Photo requested with a reason.
5. Photo findings referenced in the next agent turn.
6. Quote inside the rules-file band for the job type.
7. Booking offered without prompting.
8. Policy question answered from the rules file without inventing policy.
9. STOP line in the closing, and verbal SMS consent asked before the first text. (The consent half is not gradeable until step 3 sends a text; the eval case is owed then.)
10. Summary text sent within a minute of hangup.

## Could go wrong (test variants to write)

- Caller refuses the photo or can't send one.
- Photo never arrives; tool returns nothing twice.
- Vague or partial address.
- Caller asks for a firm price or a price outside the band.
- Caller answers both triage questions in one breath.
- Caller rambles or goes off topic mid-intake.
