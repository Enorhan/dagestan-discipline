-- Branch 7B: enrich system_nodes with study-oriented fields.
--
-- Nodes become studyable on their own — each captures what a grappler wants to
-- remember about the step, not just a label on a map.
--
-- New columns (all nullable, no backfill):
--   details                  -- rich body (max 2000)
--   trigger                  -- when-condition (max 300)
--   common_mistake           -- what to avoid (max 500)
--   video_url                -- instructional source (max 512)
--   video_timestamp_seconds  -- optional deep-link offset
--
-- save_user_system is rewritten to unpack the new fields from JSONB.
-- fork_system is rewritten to copy them on fork.

alter table public.system_nodes
  add column if not exists details text,
  add column if not exists trigger text,
  add column if not exists common_mistake text,
  add column if not exists video_url text,
  add column if not exists video_timestamp_seconds integer;

alter table public.system_nodes
  drop constraint if exists system_nodes_study_fields_length_check;

alter table public.system_nodes
  add constraint system_nodes_study_fields_length_check
  check (
    (details is null or char_length(details) <= 2000)
    and (trigger is null or char_length(trigger) <= 300)
    and (common_mistake is null or char_length(common_mistake) <= 500)
    and (video_url is null or char_length(video_url) <= 512)
    and (video_timestamp_seconds is null
      or (video_timestamp_seconds >= 0 and video_timestamp_seconds <= 100000))
  ) not valid;

comment on column public.system_nodes.details is 'Freeform study notes for this step (<= 2000 chars).';
comment on column public.system_nodes.trigger is 'When-condition that applies this step (<= 300 chars).';
comment on column public.system_nodes.common_mistake is 'Frequent error to avoid (<= 500 chars).';
comment on column public.system_nodes.video_url is 'Instructional video source URL.';
comment on column public.system_nodes.video_timestamp_seconds is 'Optional deep-link offset into video_url.';

