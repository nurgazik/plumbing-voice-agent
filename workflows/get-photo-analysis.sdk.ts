import { workflow, node, trigger, sticky, newCredential, ifElse, expr } from '@n8n/workflow-sdk';

const toolWebhook = trigger({
  type: 'n8n-nodes-base.webhook',
  version: 2.1,
  config: {
    name: 'Retell tool: get_photo_analysis',
    parameters: { httpMethod: 'POST', path: 'tools/get-photo-analysis', responseMode: 'responseNode' },
    output: [{ json: { body: { name: 'get_photo_analysis', args: { caller_phone: '+16045550123' }, call: { call_id: 'call_1', from_number: '+16045550123' } } } }]
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
          { id: 'c1', name: 'phone', value: expr('{{ $json.body?.args?.caller_phone ?? $json.body?.call?.from_number ?? $json.caller_phone ?? "" }}'), type: 'string' },
          { id: 'c2', name: 'retell_call_id', value: expr('{{ $json.body?.call?.call_id ?? $json.call_id ?? "" }}'), type: 'string' },
          { id: 'c3', name: 'since', value: expr('{{ $now.minus({ minutes: 30 }).toISO() }}'), type: 'string' }
        ]
      }
    },
    output: [{ json: { phone: '+16045550123', retell_call_id: 'call_1', since: '2026-09-13T22:36:43Z' } }]
  }
});

const latestPhoto = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Latest analyzed photo from this number',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    alwaysOutputData: true,
    parameters: {
      resource: 'row',
      operation: 'getAll',
      tableId: 'photos',
      returnAll: false,
      limit: 1,
      orderBy: 'received_at.desc',
      filterType: 'manual',
      matchType: 'allFilters',
      filters: {
        conditions: [
          { keyName: 'caller_phone', condition: 'eq', keyValue: expr('{{ $json.phone }}') },
          { keyName: 'received_at', condition: 'gte', keyValue: expr('{{ $json.since }}') },
          { keyName: 'analysis_status', condition: 'eq', keyValue: 'done' }
        ]
      }
    },
    output: [{ json: { id: 'uuid', received_at: '2026-09-13T23:06:43Z', analysis: { job_type: 'p_trap_leak', spoken_summary: '...' } } }]
  }
});

const found = ifElse({
  version: 2.3,
  config: {
    name: 'Photo found?',
    parameters: {
      conditions: {
        options: { caseSensitive: true, leftValue: '', typeValidation: 'loose', version: 2 },
        conditions: [{ leftValue: expr('{{ $json.id }}'), rightValue: '', operator: { type: 'string', operation: 'exists', singleValue: true } }],
        combinator: 'and'
      }
    }
  }
});

const respondFound = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond with analysis',
    parameters: {
      respondWith: 'json',
      responseBody: expr('{{ JSON.stringify({ found: true, received_at: $json.received_at, analysis: $json.analysis }) }}')
    },
    output: [{ json: { id: 'uuid', analysis: {} } }]
  }
});

const claimPhoto = node({
  type: 'n8n-nodes-base.supabase',
  version: 1,
  config: {
    name: 'Attach photo to this call',
    credentials: { supabaseApi: newCredential('Supabase Dry Run') },
    onError: 'continueRegularOutput',
    parameters: {
      resource: 'row',
      operation: 'update',
      tableId: 'photos',
      filterType: 'manual',
      matchType: 'allFilters',
      filters: { conditions: [{ keyName: 'id', condition: 'eq', keyValue: expr('{{ $json.id }}') }] },
      dataToSend: 'defineBelow',
      fieldsUi: { fieldValues: [{ fieldId: 'retell_call_id', fieldValue: expr("{{ $('Normalize tool call').item.json.retell_call_id }}") }] }
    },
    output: [{ json: { id: 'uuid' } }]
  }
});

const respondNone = node({
  type: 'n8n-nodes-base.respondToWebhook',
  version: 1.5,
  config: {
    name: 'Respond: nothing yet',
    parameters: {
      respondWith: 'json',
      responseBody: '{ "found": false, "message": "No photo has come through from this number yet. Tell the caller it has not arrived and wait, then try once more." }'
    },
    output: [{ json: { found: false } }]
  }
});

const note = sticky('get_photo_analysis (build step 2). Retell calls this when the agent uses the tool. Looks up the newest analyzed photo from the caller number since five minutes before the call started (30 minutes back if Retell sends no start time) and returns it, or says nothing has arrived. Source of truth: workflows/get-photo-analysis.sdk.ts in the repo.', { position: [0, -300], width: 520, height: 120 });

export default workflow('dry-run-get-photo-analysis', 'Dry Run: tool get_photo_analysis')
  .add(note)
  .add(toolWebhook)
  .to(normalize)
  .to(latestPhoto)
  .to(found.onTrue(respondFound.to(claimPhoto)).onFalse(respondNone));
