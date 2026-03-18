-- ========================================
-- STORAGE BUCKET + ADMIN CONFIG
-- Jordan's Archives — Blog Admin Setup
-- Run this in the Supabase SQL Editor
-- ========================================


-- 1. Admin config table (stores password hash, settings)
CREATE TABLE IF NOT EXISTS admin_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_config ENABLE ROW LEVEL SECURITY;

-- Allow reading config (needed to verify password)
CREATE POLICY "Anon can read admin config"
  ON admin_config FOR SELECT
  USING (true);

-- Allow inserting config (for first-time password setup)
CREATE POLICY "Anon can insert admin config"
  ON admin_config FOR INSERT
  WITH CHECK (true);


-- 2. Storage bucket for blog images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog-images',
  'blog-images',
  true,
  5242880,  -- 5MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- Allow anyone to read images (public bucket)
CREATE POLICY "Public can view blog images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'blog-images');

-- Allow uploads via the anon key (for Jordan's admin use)
CREATE POLICY "Anon can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'blog-images');

-- Allow deletions via the anon key
CREATE POLICY "Anon can delete blog images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'blog-images');
