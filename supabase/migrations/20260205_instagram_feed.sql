-- Instagram-style posts feed schema

-- Ensure sport_type exists (from prior migrations)
DO $$ BEGIN
  CREATE TYPE sport_type AS ENUM ('wrestling', 'judo', 'bjj');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Post media and visibility enums
DO $$ BEGIN
  CREATE TYPE post_media_type AS ENUM ('image', 'video');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE post_visibility AS ENUM ('public', 'followers');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Posts table
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  caption TEXT,
  media_type post_media_type NOT NULL,
  visibility post_visibility NOT NULL DEFAULT 'public',
  sport sport_type,
  tags TEXT[],
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  save_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Media table (one row per post)
CREATE TABLE IF NOT EXISTS post_media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  image_url TEXT,
  mux_asset_id TEXT,
  mux_playback_id TEXT,
  mux_upload_id TEXT,
  poster_url TEXT,
  duration NUMERIC,
  width INTEGER,
  height INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id)
);

-- Likes
CREATE TABLE IF NOT EXISTS likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Saves
CREATE TABLE IF NOT EXISTS saves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Feed events (optional analytics)
CREATE TABLE IF NOT EXISTS feed_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  value NUMERIC,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);
CREATE INDEX IF NOT EXISTS idx_posts_sport ON posts(sport);

CREATE INDEX IF NOT EXISTS idx_post_media_post_id ON post_media(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);
CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_saves_post_id ON saves(post_id);
CREATE INDEX IF NOT EXISTS idx_saves_user_id ON saves(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_post_id ON feed_events(post_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_user_id ON feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_type ON feed_events(event_type);

-- Updated_at triggers (function defined in earlier migrations)
DROP TRIGGER IF EXISTS update_posts_updated_at ON posts;
CREATE TRIGGER update_posts_updated_at
  BEFORE UPDATE ON posts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_post_media_updated_at ON post_media;
CREATE TRIGGER update_post_media_updated_at
  BEFORE UPDATE ON post_media
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Count maintenance functions
CREATE OR REPLACE FUNCTION handle_post_like_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET like_count = COALESCE(like_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_post_save_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET save_count = COALESCE(save_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET save_count = GREATEST(COALESCE(save_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_post_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE posts SET comment_count = COALESCE(comment_count, 0) + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE posts SET comment_count = GREATEST(COALESCE(comment_count, 0) - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Triggers for counts
DROP TRIGGER IF EXISTS likes_count_trigger ON likes;
CREATE TRIGGER likes_count_trigger
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_like_count();

DROP TRIGGER IF EXISTS saves_count_trigger ON saves;
CREATE TRIGGER saves_count_trigger
  AFTER INSERT OR DELETE ON saves
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_save_count();

DROP TRIGGER IF EXISTS comments_count_trigger ON comments;
CREATE TRIGGER comments_count_trigger
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW
  EXECUTE FUNCTION handle_post_comment_count();

-- Row Level Security
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE feed_events ENABLE ROW LEVEL SECURITY;

-- Posts policies
DROP POLICY IF EXISTS "Posts are viewable by anyone when public" ON posts;
CREATE POLICY "Posts are viewable by anyone when public"
  ON posts FOR SELECT
  USING (
    visibility = 'public'
    OR user_id = auth.uid()
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows f
        WHERE f.follower_id = auth.uid()
          AND f.following_id = posts.user_id
      )
    )
  );

DROP POLICY IF EXISTS "Users can create their own posts" ON posts;
CREATE POLICY "Users can create their own posts"
  ON posts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own posts" ON posts;
CREATE POLICY "Users can update their own posts"
  ON posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own posts" ON posts;
CREATE POLICY "Users can delete their own posts"
  ON posts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Post media policies
DROP POLICY IF EXISTS "Post media is viewable when post is viewable" ON post_media;
CREATE POLICY "Post media is viewable when post is viewable"
  ON post_media FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = p.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can create media for their posts" ON post_media;
CREATE POLICY "Users can create media for their posts"
  ON post_media FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can update media for their posts" ON post_media;
CREATE POLICY "Users can update media for their posts"
  ON post_media FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete media for their posts" ON post_media;
CREATE POLICY "Users can delete media for their posts"
  ON post_media FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = post_media.post_id
        AND p.user_id = auth.uid()
    )
  );

-- Likes policies
DROP POLICY IF EXISTS "Users can view their likes" ON likes;
CREATE POLICY "Users can view their likes"
  ON likes FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can like posts" ON likes;
CREATE POLICY "Users can like posts"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = likes.post_id
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = p.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can remove their likes" ON likes;
CREATE POLICY "Users can remove their likes"
  ON likes FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Saves policies
DROP POLICY IF EXISTS "Users can view their saves" ON saves;
CREATE POLICY "Users can view their saves"
  ON saves FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can save posts" ON saves;
CREATE POLICY "Users can save posts"
  ON saves FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = saves.post_id
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = p.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can remove their saves" ON saves;
CREATE POLICY "Users can remove their saves"
  ON saves FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Comments policies
DROP POLICY IF EXISTS "Comments are viewable for visible posts" ON comments;
CREATE POLICY "Comments are viewable for visible posts"
  ON comments FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = p.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can add comments" ON comments;
CREATE POLICY "Users can add comments"
  ON comments FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM posts p
      WHERE p.id = comments.post_id
        AND (
          p.visibility = 'public'
          OR p.user_id = auth.uid()
          OR (
            p.visibility = 'followers'
            AND EXISTS (
              SELECT 1 FROM follows f
              WHERE f.follower_id = auth.uid()
                AND f.following_id = p.user_id
            )
          )
        )
    )
  );

DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
CREATE POLICY "Users can delete their own comments"
  ON comments FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Feed events policies
DROP POLICY IF EXISTS "Users can insert feed events" ON feed_events;
CREATE POLICY "Users can insert feed events"
  ON feed_events FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can view their feed events" ON feed_events;
CREATE POLICY "Users can view their feed events"
  ON feed_events FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Storage bucket for post media (images)
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-media', 'post-media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for post media bucket
DROP POLICY IF EXISTS "Public read post media" ON storage.objects;
CREATE POLICY "Public read post media"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated upload post media" ON storage.objects;
CREATE POLICY "Authenticated upload post media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'post-media');

DROP POLICY IF EXISTS "Authenticated delete post media" ON storage.objects;
CREATE POLICY "Authenticated delete post media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'post-media' AND owner = auth.uid());
