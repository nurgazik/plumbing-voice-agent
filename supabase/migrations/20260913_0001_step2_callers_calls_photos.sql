-- Step 2: the three tables the photo loop touches.
-- callers: one row per phone number. calls: one row per Retell call.
-- photos: one row per MMS the caller texts; matched to the caller by phone
-- number and time, not by call id, because Twilio's webhook does not know
-- which Retell call is in progress (docs/decisions.md, 2026-09-13).
-- Later steps add quotes, bookings, escalations, follow-ups in their own files.

create extension if not exists pgcrypto;

create table if not exists callers (
  id               uuid primary key default gen_random_uuid(),
  phone            text not null unique,           -- E.164, e.g. +16045550123
  name             text,
  sms_consent_at   timestamptz,                    -- set when the caller says yes on a call
  sms_opted_out_at timestamptz,                    -- set on STOP; never text after this
  first_seen_at    timestamptz not null default now(),
  last_seen_at     timestamptz not null default now(),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create table if not exists calls (
  id                uuid primary key default gen_random_uuid(),
  retell_call_id    text not null unique,
  caller_id         uuid references callers(id),
  from_number       text not null,
  started_at        timestamptz,
  ended_at          timestamptz,
  urgency_tier      text check (urgency_tier in ('emergency','urgent','routine')),
  job_type          text,                          -- a job_types key from rules/plumbing.yaml
  transcript        text,                          -- Retell's text transcript, from the call-ended webhook
  recording_url     text,                          -- Retell keeps the audio; we keep the link
  summary           text,                          -- written by Sonnet at step 5
  disconnect_reason text,
  retell_payload    jsonb,                         -- raw call-ended body, for debugging
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists photos (
  id                 uuid primary key default gen_random_uuid(),
  caller_phone       text not null,
  caller_id          uuid references callers(id),
  call_id            uuid references calls(id),    -- filled in when a tool call claims the photo
  twilio_message_sid text not null unique,
  twilio_media_sid   text,
  media_url          text not null,                -- Twilio's URL; needs Twilio auth to fetch
  content_type       text,
  received_at        timestamptz not null default now(),
  analysis_status    text not null default 'pending' check (analysis_status in ('pending','done','failed')),
  analysis           jsonb,                        -- structured vision result: fixture, problem, job_type, confidence, notes
  analysis_model     text,
  analysis_error     text,
  langfuse_trace_id  text,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists photos_caller_phone_received_idx on photos (caller_phone, received_at desc);
create index if not exists calls_caller_id_idx on calls (caller_id);

-- Keep updated_at honest without every writer remembering to set it.
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists callers_updated_at on callers;
create trigger callers_updated_at before update on callers for each row execute function set_updated_at();
drop trigger if exists calls_updated_at on calls;
create trigger calls_updated_at before update on calls for each row execute function set_updated_at();
drop trigger if exists photos_updated_at on photos;
create trigger photos_updated_at before update on photos for each row execute function set_updated_at();

-- Row level security on, no policies: the public (publishable) key can read nothing.
-- n8n uses the secret key, which bypasses RLS. Standard Supabase default for server-only tables.
alter table callers enable row level security;
alter table calls   enable row level security;
alter table photos  enable row level security;
