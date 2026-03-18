-- ========================================
-- BLOG POSTS & COMMENTS SCHEMA
-- Jordan's Archives — Secret Blog
-- ========================================

-- Blog posts table
CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  topic TEXT,                          -- e.g. "Design", "Life", "Tech", "Business"
  slug TEXT UNIQUE NOT NULL,           -- URL-friendly slug
  content TEXT NOT NULL,               -- HTML or markdown body
  excerpt TEXT,                        -- Short preview text for cards
  cover_image TEXT,                    -- URL to cover image (optional)
  published_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_published BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Blog comments / updates table (for author updates and notes on posts)
CREATE TABLE IF NOT EXISTS blog_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES blog_posts(id) ON DELETE CASCADE,
  author TEXT DEFAULT 'Jordan',        -- always Jordan for now
  content TEXT NOT NULL,
  comment_type TEXT DEFAULT 'update',  -- 'update', 'note', 'comment'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast post lookups
CREATE INDEX IF NOT EXISTS idx_blog_posts_slug ON blog_posts(slug);
CREATE INDEX IF NOT EXISTS idx_blog_posts_published ON blog_posts(published_date DESC) WHERE is_published = true;
CREATE INDEX IF NOT EXISTS idx_blog_comments_post ON blog_comments(post_id, created_at DESC);

-- Enable RLS
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE blog_comments ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view published posts)
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- Public read access for comments
CREATE POLICY "Public can read comments"
  ON blog_comments FOR SELECT
  USING (true);

-- Anon key can insert/update/delete (for Jordan's admin use via the anon key)
CREATE POLICY "Anon can insert posts"
  ON blog_posts FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update posts"
  ON blog_posts FOR UPDATE
  USING (true);

CREATE POLICY "Anon can delete posts"
  ON blog_posts FOR DELETE
  USING (true);

CREATE POLICY "Anon can insert comments"
  ON blog_comments FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anon can update comments"
  ON blog_comments FOR UPDATE
  USING (true);

CREATE POLICY "Anon can delete comments"
  ON blog_comments FOR DELETE
  USING (true);

-- Seed a sample post so the page isn't empty
INSERT INTO blog_posts (title, topic, slug, content, excerpt, published_date) VALUES
(
  'Welcome to the Archives',
  'Life',
  'welcome-to-the-archives',
  '<p>This is the first entry in my secret corner of the internet. If you found this, you''re one of the few.</p><p>I built this space because sometimes I just need somewhere to put my thoughts — about design, about life, about the things I''m building. No algorithm, no metrics, just words.</p><p>More to come. Stay curious.</p>',
  'If you found this, you''re one of the few.',
  CURRENT_DATE
);

-- Seed a sample comment/update on that post
INSERT INTO blog_comments (post_id, content, comment_type)
SELECT id, 'Just set this up. Feels good to have a quiet place to write.', 'update'
FROM blog_posts WHERE slug = 'welcome-to-the-archives';
