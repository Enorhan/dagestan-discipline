-- Remove Instagram-style post feed schema (community features)

-- Storage policies for post media bucket
DROP POLICY IF EXISTS "Public read post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated upload post media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated delete post media" ON storage.objects;

-- Remove post media bucket and objects
DELETE FROM storage.objects WHERE bucket_id = 'post-media';
DELETE FROM storage.buckets WHERE id = 'post-media';

-- Drop triggers (safe if tables already gone)
DROP TRIGGER IF EXISTS likes_count_trigger ON likes;
DROP TRIGGER IF EXISTS saves_count_trigger ON saves;
DROP TRIGGER IF EXISTS comments_count_trigger ON comments;
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
DROP TRIGGER IF EXISTS update_post_media_updated_at ON post_media;

-- Drop tables
DROP TABLE IF EXISTS feed_events CASCADE;
DROP TABLE IF EXISTS comments CASCADE;
DROP TABLE IF EXISTS saves CASCADE;
DROP TABLE IF EXISTS likes CASCADE;
DROP TABLE IF EXISTS post_media CASCADE;
DROP TABLE IF EXISTS posts CASCADE;

-- Drop count functions
DROP FUNCTION IF EXISTS handle_post_like_count();
DROP FUNCTION IF EXISTS handle_post_save_count();
DROP FUNCTION IF EXISTS handle_post_comment_count();

-- Drop enums
DROP TYPE IF EXISTS post_media_type;
DROP TYPE IF EXISTS post_visibility;
