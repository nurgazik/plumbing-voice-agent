-- The get_photo_analysis tool runs during a live call, before any calls row
-- exists (the call-started webhook is step 5). Record Retell's call id directly
-- on the photo so the link survives; call_id (our uuid) is filled in later.
alter table photos add column if not exists retell_call_id text;
create index if not exists photos_retell_call_id_idx on photos (retell_call_id);
