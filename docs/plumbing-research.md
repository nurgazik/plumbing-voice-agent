# What real plumbers do, and what the rules file does about it

Research pass on 2026-09-12: 17 Metro Vancouver plumbing company sites (12 with usable pricing or policy), 3 Canadian cost guides, 16 dispatch and answering-service sources, and BC regulators (Technical Safety BC, City of Vancouver, FortisBC, BC Laws). This note is the short version. Numbers are CAD. Every rules-file value below traces to something here; where we chose to differ from practice, it says so.

## Pricing

Observed. Upfront flat-rate after on-site diagnosis is the dominant model (Gator, Quan, Mr. Rooter, Right Choice, Ashton, Pacific Blue, Lambert, Lew). Pure hourly is the minority (Vancouver City Plumbing: $125/hr, 1.5 hr minimum, $250/hr after 4 pm). Service call or diagnostic fee $99 to $150, commonly waived when work is approved (Quan: $120 plus GST, waived). After-hours is either 2x hourly, a fixed callout ($199 at The Crazy Plumber), or explicitly none (Mr. Rooter, Roto-Rooter, Pacific Blue). Cost guides: labour $104 to $170/hr, emergency 1.5 to 2x, small leak under sink $150 to $300, snaking $150 to $400, faucet repair $150 to $350, running toilet $130 to $300, frozen pipe $250 to $600, burst pipe $400 to $1,500, tank replacement $1,500 to $3,500.

Rules file. Flat-rate model, $120 service fee waived on approval, $199 after-hours callout, no weekend surcharge for booked visits, bands set from the guide ranges above, big-ticket items (heaters, repiping, sewer, mains) in writing only.

Where we differ. No real shop gives a repair price range by phone. The scripted deflection everywhere is "the service fee is $X, applied to the repair; the tech quotes a flat rate before work starts." The golden call quotes a band from a photo. We keep the band because it is the demo's point, but the agent now leads with the service fee and calls the band a typical range confirmed on site. BC's consumer protection act (BPCPA s.4(3)(c)) makes an estimate materially below the final price a deceptive practice unless the customer consents first, so the quote line says the plumber won't go above it without the caller's okay.

## Intake and triage

Observed. Canonical order across ServiceTitan, Housecall Pro, OnCrew, Pipeline On: problem, then name and callback number "in case we get cut off," then the triage fork, then address, property type, owner or tenant, access details. The single fork question: "Is anything actively leaking, smelling like gas, or backing up into the home right now?" Emergency flags: uncontrolled flow, sewage in living space, complete water loss, gas smell, water on electrical. The cleanest tier rule (Anderson Plumbing): if the caller can isolate it with a shutoff, it is not an emergency. Three tiers are universal: emergency (dispatch now, 60 to 90 min on site), urgent (first slot next morning), routine (next available). Two-hour arrival windows, 30-minute call-ahead, two options offered at booking.

Rules file. Kept the spec's two triage questions. Added a listen-for list (electrical, ceiling, unit below, sewage, no water, gas) that moves a call to emergency without asking. Added the containment rule, no_water as an emergency job type, frozen pipe and sump pump as urgent, per-tier callback lines, arrival windows and call-ahead, conditional intake (property type when a unit is given, owner or tenant at booking, access at booking).

Where we differ. Real CSRs take name and number before triage. The spec triages first. Kept the spec; on voice with an AI, getting the safety question out first is defensible.

## Condos and strata

Observed. Absent from every US template; only Canadian strata sources cover it. Strata Property Act: pipes serving more than one lot or in boundary walls are common property. Suites usually have an isolation valve (entry closet, under sink, utility chase). Residents should not touch riser or building mains; building management controls those. Plumbers need strata authorization and access for common-property work.

Rules file. New property section and a strata-specific safety instruction: find the suite valve, do not touch the building shutoff, call building management in parallel, never promise to shut building water.

## Gas

Observed. Gas work in BC needs a Technical Safety BC certified fitter under a licensed gas contractor; a plumbing ticket alone does not cover it. Many Vancouver plumbers are also gas contractors. FortisBC's instruction if you smell gas: stop, no phone or switches inside, go outside and leave the door open, then call 1-800-663-9911 or 911.

Rules file. Dry Run is not a gas contractor (a deliberate simplification, flagged in licensing). Gas instruction uses FortisBC's wording and number. No intake, no escalation.

## Permits and licensing

Observed. City of Vancouver: no permit to repair leaks, replace valves or faucets, replace fixtures in place, or clear clogs. Everything else needs one, pulled by the contractor. Consumers are told to ask for a business licence and a TSBC licence number.

Rules file. Permits section with the four exempt items and a "we pull it" line. Licensing section with fictional numbers in real formats so "are you licensed?" is answered from data.

## Compliance

Observed. CASL: every commercial text must identify the sender, include a mailing address and a contact, and carry a no-cost unsubscribe honoured within 10 business days. Transactional texts (a quote the caller asked for) are exempt from consent but still need identification and unsubscribe. Call recording: Canadian privacy guidance wants notice plus purpose; proceeding after notice is implied consent. AI disclosure: no federal or BC law requires it as of 2026-09; best practice, and it closes off a deceptive-practice argument.

Rules file. Recording disclosure now states a purpose ("for quality and to help with your quote"). New sms_footer with name, address, phone, STOP. STOP honoured immediately.

## Seasonal

Observed. January 2024 cold snap: over $180M insured damage, mostly burst pipes. October 2024 atmospheric river: over $110M, sewer backups and flooded basements. Vancouver's older combined sewers surcharge in heavy rain.

Rules file. Seasonal section with an honest surge notice, a frozen-versus-burst triage note, and a "floor drain in heavy rain is a backup, not a leak" note.

## Spec lines this research suggests changing

Not changed here; these are the spec owner's call.

- golden-call.md opener: add the recording purpose. "this call is recorded for quality and to help with your quote, and you're speaking with an AI assistant."
- golden-call.md quote turn: lead with the service fee, then the range. "There's a $120 service call fee, waived if you go ahead. A repair like this usually runs $175 to $350 all in..."
- golden-call.md Sunday booking: hours now say weekend booked visits at regular rate, which the spec's "Sunday morning is our regular rate" already implies.
- emergency-call.md callout fee: state the $199 amount on the call, not "Sam will confirm the amount." BC consumer law wants fees disclosed with the same prominence as the rate, before commitment.
- emergency-call.md: add "is this a house or a condo?" before the main-shutoff instruction, because in a strata the caller should not touch the building main.

## Sources

Pricing: vancouvercityplumbing.ca/prices, gatorplumbing.ca, quanplumbing.com, mrrooter.ca/burnaby, rightchoiceplumbing.ca, mrplunger.ca, thecrazyplumber.ca/pricing, vancouverplumbingservices.ca, plumbhartt.com (site and 2026 cost guide), callashton.com, rotorooter.com/ca, pacificbluemechanical.ca, lambertplumbing.ca, lewplumbing.com, trustitplumbing.com, lordmechanical.ca rates blog; guides homeservicebc.ca, renoquotes.com, canadaplumberspot.com.

Dispatch: servicetitan.com call-center script and playbook, housecallpro.com dispatcher templates, oncrew.ai dispatcher script, pipelineon.com CSR script, getnextphone.com emergency workflow, calljolt.com protocols, schedulingkit.com, servicenation.com, fieldproxy.ai, answering365.com, answernet.com, contractorincharge.com, andersonplumbingheatingandair.com emergency definition, andyspipedream.com arrival windows, hippoplumbing.com strata guide, trueserviceplumbing.ca condo shutoff.

Regulatory: technicalsafetybc.ca (gas licences, Class B, contractor guide), vancouver.ca (gas, plumbing, mechanical permits, when-you-need-a-permit), fortisbc.com gas leaks and odour, bclaws.gov.bc.ca (BPCPA, Strata Property Act and standard bylaws), laws-lois.justice.gc.ca (CASL and regulations), priv.gc.ca call recording guidance, ibc.ca cold snap and atmospheric river releases.
