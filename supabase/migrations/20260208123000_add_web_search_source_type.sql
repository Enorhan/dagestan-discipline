-- Allow web_search as a content source type.

ALTER TABLE public.content_sources
  DROP CONSTRAINT IF EXISTS content_sources_source_type_check;

ALTER TABLE public.content_sources
  ADD CONSTRAINT content_sources_source_type_check
  CHECK (source_type IN ('youtube_search', 'rss_feed', 'reddit_search', 'web_search', 'web_url', 'social_feed'));

