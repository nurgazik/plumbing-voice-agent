-- Step 3: one row per quote texted to a caller.
-- The band is copied onto the row as sent, so a later change to the rules file
-- does not rewrite history. One quote per Retell call: the tool can be called
-- twice by a nervous agent, and the second call must not send a second text.
-- consent_recorded_at is when the workflow sent the text; the agent only calls
-- send_quote after a spoken yes, and the call recording is the legal record.

create table if not exists quotes (
  id                   uuid primary key default gen_random_uuid(),
  retell_call_id       text not null unique,          -- one quote per call
  call_id              uuid references calls(id),     -- filled at step 5 when the calls row exists
  caller_id            uuid references callers(id),
  caller_phone         text not null,                 -- E.164
  job_type             text not null,                 -- a job_types key from rules/plumbing.yaml
  severity             text not null check (severity in ('routine','urgent')),
  summary              text,                          -- the agent's one-sentence summary in the caller's terms
  band_min_cad         integer,                       -- null when no band (the tool answered no_band)
  band_max_cad         integer,
  service_call_fee_cad integer,
  message_body         text,                          -- the exact text sent
  twilio_message_sid   text,
  sms_status           text not null check (sms_status in ('sent','failed','skipped')),
  sms_error            text,
  consent_recorded_at  timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create index if not exists quotes_caller_phone_idx on quotes (caller_phone, created_at desc);

drop trigger if exists quotes_updated_at on quotes;
create trigger quotes_updated_at before update on quotes for each row execute function set_updated_at();

alter table quotes enable row level security;
