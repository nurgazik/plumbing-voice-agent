import { workflow, node, trigger, sticky, newCredential, ifElse, expr } from '@n8n/workflow-sdk';


// Retell posts {name, call, args} (args_at_root is false in agent/push.ts).
const toolWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Retell tool: send_quote',
    parameters: { httpMethod: 'POST', path: 'tools/send-quote', responseMode: 'responseNode' },
    output: [{ json: { body: { name: 'send_quote', args: { job_type: 'p_trap_leak', severity: 'routine', summary: 'Drip at the P-trap joint.' }, call: { call_id: 'call_1', from_number: '+16045550123', to_number: '+17786546764' } } } }]
  }
});

const normalize = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Normalize tool call',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'c1', name: 'phone', value: expr('{{ $json.body?.call?.from_number ?? $json.body?.args?.caller_phone ?? "" }}'), type: 'string' },
          { id: 'c2', name: 'our_number', value: expr('{{ $json.body?.call?.to_number ?? "" }}'), type: 'string' },
          { id: 'c3', name: 'retell_call_id', value: expr('{{ $json.body?.call?.call_id ?? "" }}'), type: 'string' },
          { id: 'c4', name: 'job_type', value: expr('{{ $json.body?.args?.job_type ?? "unknown" }}'), type: 'string' },
          { id: 'c5', name: 'severity', value: expr('{{ $json.body?.args?.severity ?? "" }}'), type: 'string' },
          { id: 'c6', name: 'summary', value: expr('{{ $json.body?.args?.summary ?? "" }}'), type: 'string' }
        ]
      }
    },
    output: [{ json: { phone: '+16045550123', our_number: '+17786546764', retell_call_id: 'call_1', job_type: 'p_trap_leak', severity: 'routine', summary: 'Drip at the P-trap joint.' } }]
  }
});

// One quote per call. A second send_quote on the same call returns the first one and sends nothing.
const existingQuote = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Existing quote for this call',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'quotes',
      returnAll: false,
      limit: 1,
      filterType: 'manual',
      matchType: 'allFilters',
      filters: { conditions: [{ keyName: 'retell_call_id', condition: 'eq', keyValue: expr("{{ $('Normalize tool call').item.json.retell_call_id }}") }] }
    },
    output: [{ json: {} }]
  }
});

const alreadyQuoted = ifElse({
  version: 2.3,
  config: {
    name: 'Already quoted?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.id }}'), rightValue: '', operator: { type: 'string', operation: 'exists', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const respondExisting = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond with the existing quote',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ sent: $json.sms_status === "sent", already_sent: true, reason: $json.sms_status === "sent" ? undefined : ($json.band_min_cad == null ? "no_band" : "sms_failed"), job_type: $json.job_type, band_min_cad: $json.band_min_cad, band_max_cad: $json.band_max_cad, service_call_fee_cad: $json.service_call_fee_cad, message: "A quote was already handled on this call. Do not send another." }) }}')
    },
    output: [{ json: {} }]
  }
});

// The price comes from RULES, rendered from rules/plumbing.yaml. No model here on purpose:
// a price is data, not something to generate (docs/decisions.md 2026-09-14).
const compose = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Pick band and compose text',
    parameters: {
      jsCode: `/* BEGIN generated from rules/plumbing.yaml (node workflows/build.js) */
const RULES = {"business_name":"Dry Run Plumbing","currency":"CAD","service_call_fee_cad":120,"sms_footer":"Dry Run Plumbing (1260794 B.C. LTD), 3308 Merlin Road, Victoria, BC V9C 0H3. Reply STOP to opt out.","job_type_keys":["p_trap_leak","supply_line_leak","faucet_drip","toilet_running","toilet_clogged","drain_slow_or_clogged","water_heater_no_hot","frozen_pipe","sump_pump_failure","burst_pipe","sewer_backup","no_water","unknown"],"job_types":{"p_trap_leak":{"label":"Leak at the P-trap or drain joint under a sink","typical_tier":"routine","price_band_cad":{"min":175,"max":350}},"supply_line_leak":{"label":"Leak at a supply line or shutoff valve under a sink or toilet","typical_tier":"urgent","price_band_cad":{"min":150,"max":350}},"faucet_drip":{"label":"Dripping faucet","typical_tier":"routine","price_band_cad":{"min":150,"max":350}},"toilet_running":{"label":"Toilet running or not filling","typical_tier":"routine","price_band_cad":{"min":130,"max":300}},"toilet_clogged":{"label":"Toilet clogged","typical_tier":"urgent","price_band_cad":{"min":150,"max":300}},"drain_slow_or_clogged":{"label":"Slow or clogged sink, tub, or shower drain","typical_tier":"routine","price_band_cad":{"min":150,"max":400}},"water_heater_no_hot":{"label":"No hot water","typical_tier":"urgent","price_band_cad":{"min":200,"max":450}},"frozen_pipe":{"label":"Frozen pipe, no burst yet","typical_tier":"urgent","price_band_cad":{"min":250,"max":600}},"sump_pump_failure":{"label":"Sump pump not running","typical_tier":"urgent","price_band_cad":null},"burst_pipe":{"label":"Burst or split pipe, water running","typical_tier":"emergency","price_band_cad":null},"sewer_backup":{"label":"Sewage backing up","typical_tier":"emergency","price_band_cad":null},"no_water":{"label":"No water to the whole home","typical_tier":"emergency","price_band_cad":null},"unknown":{"label":"Not clearly one of the above","typical_tier":"routine","price_band_cad":null}}};
/* END generated */
const ctx = $('Normalize tool call').first().json;
const jt = RULES.job_types[ctx.job_type];
const tierOk = ctx.severity === 'routine' || ctx.severity === 'urgent';
const band = jt && jt.price_band_cad ? jt.price_band_cad : null;
const base = {
  phone: ctx.phone, our_number: ctx.our_number, retell_call_id: ctx.retell_call_id,
  job_type: ctx.job_type, severity: tierOk ? ctx.severity : 'routine', summary: ctx.summary,
  label: jt ? jt.label : null, service_call_fee_cad: RULES.service_call_fee_cad,
  band_min_cad: band ? band.min : null, band_max_cad: band ? band.max : null,
  consent_recorded_at: new Date().toISOString(),
};
if (!tierOk) return [{ json: { ...base, send: false, reason: 'wrong_tier', message: 'send_quote only runs on the routine or urgent tier. Nothing was texted.' } }];
if (!band) return [{ json: { ...base, send: false, reason: 'no_band', message: 'No price band for this job type. A plumber quotes after looking. Nothing was texted.' } }];
const text = RULES.business_name + ' quote for ' + jt.label.charAt(0).toLowerCase() + jt.label.slice(1) + ': typically $' + band.min + ' to $' + band.max + ' ' + RULES.currency + ', including the $' + RULES.service_call_fee_cad + ' service call fee. Preliminary, based on your photo and what you told us. The plumber confirms the price on site before any work starts and won\\'t go above it without your okay. ' + RULES.sms_footer;
return [{ json: { ...base, send: true, message_body: text } }];`
    },
    output: [{ json: { send: true, phone: '+16045550123', our_number: '+17786546764', retell_call_id: 'call_1', job_type: 'p_trap_leak', label: 'Leak at the P-trap or drain joint under a sink', band_min_cad: 175, band_max_cad: 350, service_call_fee_cad: 120, message_body: '...' } }]
  }
});

const hasBand = ifElse({
  version: 2.3,
  config: {
    name: 'Anything to send?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.send }}'), rightValue: true, operator: { type: 'boolean', operation: 'true', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const sendSms = node({
  type: 'n8n-nodes-base.twilio',
  version: 1,
  config: {
    name: 'Text the quote',
    credentials: { twilioApi: newCredential('Twilio Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'sms',
      operation: 'send',
      from: expr("{{ $('Pick band and compose text').item.json.our_number }}"),
      to: expr("{{ $('Pick band and compose text').item.json.phone }}"),
      message: expr("{{ $('Pick band and compose text').item.json.message_body }}")
    },
    output: [{ json: { sid: 'SM123', status: 'queued' } }]
  }
});

const recordSent = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Record the send result',
    parameters: {
      jsCode: `const q = $('Pick band and compose text').first().json;
const r = $input.first().json || {};
const failed = !!r.error || !r.sid;
const err = failed ? (typeof r.error === 'string' ? r.error : JSON.stringify(r.error || r)) : null;
return [{ json: { ...q, sms_status: failed ? 'failed' : 'sent', twilio_message_sid: r.sid || null, sms_error: err } }];`
    },
    output: [{ json: { sms_status: 'sent', twilio_message_sid: 'SM123' } }]
  }
});

const recordSkipped = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Record the skipped quote',
    parameters: { jsCode: `const q = $input.first().json; return [{ json: { ...q, sms_status: 'skipped', twilio_message_sid: null, sms_error: q.reason } }];` },
    output: [{ json: { sms_status: 'skipped' } }]
  }
});

const insertSent = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Store the quote',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'create',
      tableId: 'quotes',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'retell_call_id', fieldValue: expr('{{ $json.retell_call_id }}') },
          { fieldId: 'caller_phone', fieldValue: expr('{{ $json.phone }}') },
          { fieldId: 'job_type', fieldValue: expr('{{ $json.job_type }}') },
          { fieldId: 'severity', fieldValue: expr('{{ $json.severity }}') },
          { fieldId: 'summary', fieldValue: expr('{{ $json.summary }}') },
          { fieldId: 'band_min_cad', fieldValue: expr('{{ $json.band_min_cad }}') },
          { fieldId: 'band_max_cad', fieldValue: expr('{{ $json.band_max_cad }}') },
          { fieldId: 'service_call_fee_cad', fieldValue: expr('{{ $json.service_call_fee_cad }}') },
          { fieldId: 'message_body', fieldValue: expr('{{ $json.message_body ?? null }}') },
          { fieldId: 'twilio_message_sid', fieldValue: expr('{{ $json.twilio_message_sid }}') },
          { fieldId: 'sms_status', fieldValue: expr('{{ $json.sms_status }}') },
          { fieldId: 'sms_error', fieldValue: expr('{{ $json.sms_error }}') },
          { fieldId: 'consent_recorded_at', fieldValue: expr('{{ $json.sms_status === "sent" ? $json.consent_recorded_at : null }}') }
        ]
      }
    },
    output: [{ json: { id: 'uuid' } }]
  }
});

const insertSkipped = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Store the skipped quote',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'create',
      tableId: 'quotes',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'retell_call_id', fieldValue: expr('{{ $json.retell_call_id }}') },
          { fieldId: 'caller_phone', fieldValue: expr('{{ $json.phone }}') },
          { fieldId: 'job_type', fieldValue: expr('{{ $json.job_type }}') },
          { fieldId: 'severity', fieldValue: expr('{{ $json.severity }}') },
          { fieldId: 'summary', fieldValue: expr('{{ $json.summary }}') },
          { fieldId: 'band_min_cad', fieldValue: expr('{{ $json.band_min_cad }}') },
          { fieldId: 'band_max_cad', fieldValue: expr('{{ $json.band_max_cad }}') },
          { fieldId: 'service_call_fee_cad', fieldValue: expr('{{ $json.service_call_fee_cad }}') },
          { fieldId: 'message_body', fieldValue: expr('{{ $json.message_body ?? null }}') },
          { fieldId: 'twilio_message_sid', fieldValue: expr('{{ $json.twilio_message_sid }}') },
          { fieldId: 'sms_status', fieldValue: expr('{{ $json.sms_status }}') },
          { fieldId: 'sms_error', fieldValue: expr('{{ $json.sms_error }}') },
          { fieldId: 'consent_recorded_at', fieldValue: expr('{{ $json.sms_status === "sent" ? $json.consent_recorded_at : null }}') }
        ]
      }
    },
    output: [{ json: { id: 'uuid' } }]
  }
});

const respondSent = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond: quote result',
    parameters: {
      respondWith: 'json',
      responseBody: expr("{{ (() => { const q = $('Record the send result').item.json; return JSON.stringify(q.sms_status === 'sent' ? { sent: true, job_type: q.job_type, label: q.label, band_min_cad: q.band_min_cad, band_max_cad: q.band_max_cad, service_call_fee_cad: q.service_call_fee_cad, message_sid: q.twilio_message_sid } : { sent: false, reason: 'sms_failed', error: q.sms_error, job_type: q.job_type, label: q.label, band_min_cad: q.band_min_cad, band_max_cad: q.band_max_cad, service_call_fee_cad: q.service_call_fee_cad }); })() }}")
    },
    output: [{ json: {} }]
  }
});

const respondSkipped = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond: nothing sent',
    parameters: {
      respondWith: 'json',
      responseBody: expr("{{ (() => { const q = $('Record the skipped quote').item.json; return JSON.stringify({ sent: false, reason: q.reason, job_type: q.job_type, message: q.message }); })() }}")
    },
    output: [{ json: {} }]
  }
});

const note = sticky('send_quote (build step 3). Retell calls this after the caller says yes to the SMS consent question. Looks up the price band for the job type in RULES (rendered from rules/plumbing.yaml by workflows/build.js), texts the quote from the number the caller dialed, stores a quotes row, and answers the tool with the band so the agent can say it aloud. No LLM: a price is data. One quote per call. Source of truth: workflows/send-quote.sdk.ts in the repo.', { position: [0, -300], width: 560, height: 150 });

export default workflow('dry-run-send-quote', 'Dry Run: tool send_quote')
  .add(note)
  .add(toolWebhook)
  .to(normalize)
  .to(existingQuote)
  .to(alreadyQuoted
    .onTrue(respondExisting)
    .onFalse(compose.to(hasBand
      .onTrue(sendSms.to(recordSent).to(insertSent).to(respondSent))
      .onFalse(recordSkipped.to(insertSkipped).to(respondSkipped)))));
