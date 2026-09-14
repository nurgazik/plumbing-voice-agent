import { workflow, node, trigger, sticky, newCredential, ifElse, expr } from '@n8n/workflow-sdk';

const twilioWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Twilio inbound message',
    parameters: { httpMethod: 'POST', path: 'twilio-inbound-mms', responseMode: 'responseNode' },
    output: [{ json: { body: { From: '+16045550123', To: '+17786546764', MessageSid: 'MM123', NumMedia: '1', MediaUrl0: 'https://api.twilio.com/x', MediaContentType0: 'image/jpeg', Body: '' } } }]
  }
});

const normalize = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Normalize Twilio fields',
    parameters: {
      mode: 'manual',
      includeOtherFields: false,
      assignments: {
        assignments: [
          { id: 'a1', name: 'from', value: expr('{{ $json.body?.From ?? $json.From ?? "" }}'), type: 'string' },
          { id: 'a2', name: 'message_sid', value: expr('{{ $json.body?.MessageSid ?? $json.MessageSid ?? "" }}'), type: 'string' },
          { id: 'a3', name: 'num_media', value: expr('{{ Number($json.body?.NumMedia ?? $json.NumMedia ?? 0) }}'), type: 'number' },
          { id: 'a4', name: 'media_url', value: expr('{{ $json.body?.MediaUrl0 ?? $json.MediaUrl0 ?? "" }}'), type: 'string' },
          { id: 'a5', name: 'content_type', value: expr('{{ $json.body?.MediaContentType0 ?? $json.MediaContentType0 ?? "" }}'), type: 'string' },
          { id: 'a6', name: 'text_body', value: expr('{{ $json.body?.Body ?? $json.Body ?? "" }}'), type: 'string' },
          { id: 'a7', name: 'received_at', value: expr('{{ $now.toISO() }}'), type: 'string' }
        ]
      }
    },
    output: [{ json: { from: '+16045550123', message_sid: 'MM123', num_media: 1, media_url: 'https://api.twilio.com/x', content_type: 'image/jpeg', text_body: '', received_at: '2026-09-13T23:06:43Z' } }]
  }
});

const ackTwilio = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Acknowledge to Twilio',
    parameters: {
      respondWith: 'text',
      responseBody: '<Response></Response>',
      options: { responseCode: 200, responseHeaders: { entries: [{ name: 'Content-Type', value: 'text/xml' }] } }
    },
    output: [{ json: { from: '+16045550123', message_sid: 'MM123', num_media: 1, media_url: 'https://api.twilio.com/x', content_type: 'image/jpeg', text_body: '', received_at: '2026-09-13T23:06:43Z' } }]
  }
});

const hasMedia = ifElse({
  version: 2.3,
  config: {
    name: 'Has a photo?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'strict', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.num_media }}'), rightValue: 0, operator: { type: 'number', operation: 'gt' } }],
        combinator: 'and'
      }
    }
  }
});

const insertPending = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Insert photo row (pending)',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    parameters: {
      resource: 'row',
      operation: 'create',
      tableId: 'photos',
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'caller_phone', fieldValue: expr('{{ $json.from }}') },
          { fieldId: 'twilio_message_sid', fieldValue: expr('{{ $json.message_sid }}') },
          { fieldId: 'media_url', fieldValue: expr('{{ $json.media_url }}') },
          { fieldId: 'content_type', fieldValue: expr('{{ $json.content_type }}') },
          { fieldId: 'received_at', fieldValue: expr('{{ $json.received_at }}') },
          { fieldId: 'analysis_status', fieldValue: 'pending' }
        ]
      }
    },
    output: [{ json: { id: 'uuid', twilio_message_sid: 'MM123', analysis_status: 'pending' } }]
  }
});

const download = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Download photo from Twilio',
    credentials: { twilioApi: newCredential('Twilio Dry Run') },
    parameters: {
      method: 'GET',
      url: expr("{{ $('Normalize Twilio fields').item.json.media_url }}"),
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'twilioApi',
      options: { response: { response: { responseFormat: 'file', outputPropertyName: 'data' } }, timeout: 20000 }
    },
    output: [{ json: {}, binary: { data: { mimeType: 'image/jpeg', fileName: 'photo.jpg' } } }]
  }
});

const toBase64 = node({
  type: 'n8n-nodes-base.extractFromFile',
  version: 1.1,
  config: {
    name: 'Photo to base64',
    parameters: { operation: 'binaryToPropery', binaryPropertyName: 'data', destinationKey: 'image_base64' },
    output: [{ json: { image_base64: '/9j/4AAQ...' } }]
  }
});

const markStart = node({
  type: 'n8n-nodes-base.set',
  version: 3.5,
  config: {
    name: 'Prepare vision request',
    parameters: {
      mode: 'manual',
      includeOtherFields: true,
      options: { stripBinary: true },
      assignments: {
        assignments: [
          { id: 'b1', name: 'started_at_ms', value: expr('{{ $now.toMillis() }}'), type: 'number' },
          { id: 'b2', name: 'model', value: 'claude-sonnet-5', type: 'string' },
          { id: 'b3', name: 'system_prompt', value: 'You are the photo triage assistant for Dry Run Plumbing, a residential plumber in Vancouver. A caller on the phone has just texted this photo of their plumbing problem. Describe only what is visible. Do not guess at causes you cannot see. Do not state prices.\n\nClassify the job as exactly one job_type from this list (from rules/plumbing.yaml; keep in sync):\np_trap_leak, supply_line_leak, faucet_drip, toilet_running, toilet_clogged, drain_slow_or_clogged, water_heater_no_hot, frozen_pipe, sump_pump_failure, burst_pipe, sewer_backup, no_water, unknown.\n\nUse "unknown" when the photo does not show plumbing, is too dark or blurry, or does not clearly match a job type. Set confidence between 0 and 1. In spoken_summary, write one or two short sentences a receptionist could say aloud to the caller, in plain words, naming the part in everyday language (for example "the curved pipe under the drain"). If the photo is not plumbing, say so plainly in spoken_summary.', type: 'string' }
        ]
      }
    },
    output: [{ json: { image_base64: '/9j/4AAQ...', started_at_ms: 1789000000000, model: 'claude-sonnet-5', system_prompt: '...' } }]
  }
});

const analyze = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Analyze photo with Claude',
    credentials: { anthropicApi: newCredential('Anthropic Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://api.anthropic.com/v1/messages',
      authentication: 'predefinedCredentialType',
      nodeCredentialType: 'anthropicApi',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'anthropic-version', value: '2023-06-01' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr('{{ JSON.stringify({ model: $json.model, max_tokens: 1024, system: $json.system_prompt, messages: [{ role: "user", content: [{ type: "image", source: { type: "base64", media_type: $("Normalize Twilio fields").item.json.content_type || "image/jpeg", data: $json.image_base64 } }, { type: "text", text: "Analyze this photo." }] }], output_config: { format: { type: "json_schema", schema: { type: "object", additionalProperties: false, required: ["is_plumbing", "fixture", "problem", "job_type", "confidence", "spoken_summary"], properties: { is_plumbing: { type: "boolean" }, fixture: { type: "string" }, problem: { type: "string" }, job_type: { type: "string", enum: ["p_trap_leak", "supply_line_leak", "faucet_drip", "toilet_running", "toilet_clogged", "drain_slow_or_clogged", "water_heater_no_hot", "frozen_pipe", "sump_pump_failure", "burst_pipe", "sewer_backup", "no_water", "unknown"] }, confidence: { type: "number" }, spoken_summary: { type: "string" } } } } } }) }}'),
      options: { response: { response: { neverError: true, responseFormat: 'json' } }, timeout: 60000 }
    },
    output: [{ json: { id: 'msg_1', model: 'claude-sonnet-5', stop_reason: 'end_turn', content: [{ type: 'text', text: '{"is_plumbing":true}' }], usage: { input_tokens: 2773, output_tokens: 126 } } }]
  }
});

const buildResults = node({
  type: 'n8n-nodes-base.code',
  version: 2,
  config: {
    name: 'Parse result and build trace',
    parameters: {
      mode: 'runOnceForAllItems',
      language: 'javaScript',
      jsCode: "const ctx = $('Normalize Twilio fields').first().json;\nconst req = $('Prepare vision request').first().json;\nconst resp = $input.first().json || {};\nconst endMs = Date.now();\nfunction hex(n) { let s = ''; for (let i = 0; i < n; i++) s += Math.floor(Math.random() * 16).toString(16); return s; }\nconst traceId = hex(32);\nconst spanId = hex(16);\nlet analysis = null;\nlet error = null;\nlet rawText = '';\ntry {\n  if (resp.error) throw new Error(JSON.stringify(resp.error));\n  rawText = (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('');\n  analysis = JSON.parse(rawText);\n} catch (e) {\n  error = 'Vision call failed: ' + e.message;\n}\nconst usage = resp.usage || {};\nconst usageDetails = { input: usage.input_tokens || 0, output: usage.output_tokens || 0, cache_read_input_tokens: usage.cache_read_input_tokens || 0, cache_creation_input_tokens: usage.cache_creation_input_tokens || 0 };\nconst str = (k, v) => ({ key: k, value: { stringValue: String(v) } });\nconst arr = (k, vs) => ({ key: k, value: { arrayValue: { values: vs.map(v => ({ stringValue: String(v) })) } } });\nconst input = [{ role: 'system', content: req.system_prompt }, { role: 'user', content: '[photo ' + (ctx.content_type || 'image') + ' from Twilio message ' + ctx.message_sid + ']' }];\nconst attributes = [\n  str('langfuse.observation.type', 'generation'),\n  str('langfuse.trace.name', 'analyze-photo'),\n  str('langfuse.user.id', ctx.from),\n  str('langfuse.environment', 'production'),\n  str('langfuse.release', 'step-2'),\n  arr('langfuse.trace.tags', ['n8n', 'photo']),\n  str('langfuse.observation.input', JSON.stringify(input)),\n  str('langfuse.observation.output', error ? error : rawText),\n  str('langfuse.observation.model.name', resp.model || req.model),\n  str('langfuse.observation.model.parameters', JSON.stringify({ max_tokens: 1024, output_format: 'json_schema' })),\n  str('langfuse.observation.usage_details', JSON.stringify(usageDetails)),\n  str('langfuse.observation.level', error ? 'ERROR' : 'DEFAULT'),\n  str('langfuse.observation.metadata.twilio_message_sid', ctx.message_sid),\n  str('langfuse.observation.metadata.job_type', analysis ? analysis.job_type : 'none'),\n  str('langfuse.observation.metadata.confidence', analysis ? analysis.confidence : 'none'),\n  str('langfuse.trace.metadata.caller_phone', ctx.from),\n  str('langfuse.trace.metadata.workflow', 'inbound-photo')\n];\nif (error) attributes.push(str('langfuse.observation.status_message', error));\nconst otlp = { resourceSpans: [{ resource: { attributes: [str('service.name', 'dry-run-plumbing-n8n')] }, scopeSpans: [{ scope: { name: 'n8n-inbound-photo' }, spans: [{ traceId, spanId, name: 'analyze-photo', kind: 1, startTimeUnixNano: String(req.started_at_ms) + '000000', endTimeUnixNano: String(endMs) + '000000', status: { code: error ? 2 : 1 }, attributes }] }] }] };\nreturn [{ json: { twilio_message_sid: ctx.message_sid, analysis_status: error ? 'failed' : 'done', analysis, analysis_model: resp.model || req.model, analysis_error: error, langfuse_trace_id: traceId, otlp } }];"
    },
    output: [{ json: { twilio_message_sid: 'MM123', analysis_status: 'done', analysis: { job_type: 'p_trap_leak' }, analysis_model: 'claude-sonnet-5', analysis_error: null, langfuse_trace_id: 'abc', otlp: {} } }]
  }
});

const updateRow = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Update photo row with analysis',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    parameters: {
      resource: 'row',
      operation: 'update',
      tableId: 'photos',
      filterType: 'manual',
      matchType: 'allFilters',
      filters: { conditions: [{ keyName: 'twilio_message_sid', condition: 'eq', keyValue: expr('{{ $json.twilio_message_sid }}') }] },
      dataToSend: 'defineBelow',
      fieldsUi: {
        fieldValues: [
          { fieldId: 'analysis_status', fieldValue: expr('{{ $json.analysis_status }}') },
          { fieldId: 'analysis', fieldValue: expr('{{ $json.analysis }}') },
          { fieldId: 'analysis_model', fieldValue: expr('{{ $json.analysis_model }}') },
          { fieldId: 'analysis_error', fieldValue: expr('{{ $json.analysis_error }}') },
          { fieldId: 'langfuse_trace_id', fieldValue: expr('{{ $json.langfuse_trace_id }}') }
        ]
      }
    },
    output: [{ json: { id: 'uuid', analysis_status: 'done' } }]
  }
});

const logTrace = node({
  type: 'n8n-nodes-base.httpRequest',
  version: 4.5,
  config: {
    name: 'Send trace to Langfuse',
    credentials: { httpBasicAuth: newCredential('Langfuse Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      method: 'POST',
      url: 'https://us.cloud.langfuse.com/api/public/otel/v1/traces',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpBasicAuth',
      sendHeaders: true,
      headerParameters: { parameters: [{ name: 'x-langfuse-ingestion-version', value: '4' }] },
      sendBody: true,
      contentType: 'json',
      specifyBody: 'json',
      jsonBody: expr("{{ JSON.stringify($('Parse result and build trace').item.json.otlp) }}"),
      options: { timeout: 15000 }
    },
    output: [{ json: { partialSuccess: {} } }]
  }
});

const note = sticky('Inbound photo (build step 2). Twilio posts every inbound SMS/MMS here. We acknowledge at once, then for messages with a photo: insert a pending photos row, download the image with Twilio auth, ask Claude Sonnet for a structured read, update the row, and send one Langfuse generation over OpenTelemetry. Source of truth: workflows/inbound-photo.sdk.ts in the repo.', { position: [0, -300], width: 520, height: 140 });

export default workflow('dry-run-inbound-photo', 'Dry Run: inbound photo')
  .add(note)
  .add(twilioWebhook)
  .to(normalize)
  .to(ackTwilio)
  .to(hasMedia.onTrue(insertPending.to(download).to(toBase64).to(markStart).to(analyze).to(buildResults).to(updateRow).to(logTrace)));
