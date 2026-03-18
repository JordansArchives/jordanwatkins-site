-- ========================================
-- SECURE RLS POLICIES
-- Jordan's Archives — Blog Security Upgrade
-- Run this in the Supabase SQL Editor
-- ========================================
-- This replaces all existing open policies with
-- proper auth-based policies. Only your authenticated
-- user can write/edit/delete. Everyone else can only
-- read published posts.
-- ========================================

-- Your Supabase Auth user ID:
-- f9977a91-793a-482d-beaf-823a61b0399d


-- ============ BLOG POSTS ============

-- Drop old open policies
DROP POLICY IF EXISTS "Public can read published posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon can insert posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon can update posts" ON blog_posts;
DROP POLICY IF EXISTS "Anon can delete posts" ON blog_posts;

-- New: Anyone can read published posts (safe — read only)
CREATE POLICY "Public can read published posts"
  ON blog_posts FOR SELECT
  USING (is_published = true);

-- New: Only Jordan can read ALL posts (including drafts)
CREATE POLICY "Admin can read all posts"
  ON blog_posts FOR SELECT
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

-- New: Only Jordan can insert posts
CREATE POLICY "Admin can insert posts"
  ON blog_posts FOR INSERT
  WITH CHECK (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

-- New: Only Jordan can update posts
CREATE POLICY "Admin can update posts"
  ON blog_posts FOR UPDATE
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

-- New: Only Jordan can delete posts
CREATE POLICY "Admin can delete posts"
  ON blog_posts FOR DELETE
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);


-- ============ BLOG COMMENTS ============

-- Drop old open policies
DROP POLICY IF EXISTS "Public can read comments" ON blog_comments;
DROP POLICY IF EXISTS "Anon can insert comments" ON blog_comments;
DROP POLICY IF EXISTS "Anon can update comments" ON blog_comments;
DROP POLICY IF EXISTS "Anon can delete comments" ON blog_comments;

-- New: Anyone can read comments (safe — read only)
CREATE POLICY "Public can read comments"
  ON blog_comments FOR SELECT
  USING (true);

-- New: Only Jordan can insert comments
CREATE POLICY "Admin can insert comments"
  ON blog_comments FOR INSERT
  WITH CHECK (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

-- New: Only Jordan can update comments
CREATE POLICY "Admin can update comments"
  ON blog_comments FOR UPDATE
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

-- New: Only Jordan can delete comments
CREATE POLICY "Admin can delete comments"
  ON blog_comments FOR DELETE
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);


-- ============ STORAGE: BLOG IMAGES ============

-- Drop old open policies
DROP POLICY IF EXISTS "Anon can upload blog images" ON storage.objects;
DROP POLICY IF EXISTS "Anon can delete blog images" ON storage.objects;

-- Keep public read (images need to be viewable by visitors)
-- "Public can view blog images" stays as is

-- New: Only Jordan can upload images
CREATE POLICY "Admin can upload blog images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'blog-images'
    AND auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid
  );

-- New: Only Jordan can delete images
CREATE POLICY "Admin can delete blog images"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'blog-images'
    AND auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid
  );

-- New: Only Jordan can update/overwrite images
CREATE POLICY "Admin can update blog images"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'blog-images'
    AND auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid
  );


-- ============ ADMIN CONFIG ============

-- Drop old open policies and lock it down
DROP POLICY IF EXISTS "Anon can read admin config" ON admin_config;
DROP POLICY IF EXISTS "Anon can insert admin config" ON admin_config;

-- Only Jordan can read/write admin config
CREATE POLICY "Admin can read config"
  ON admin_config FOR SELECT
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

CREATE POLICY "Admin can insert config"
  ON admin_config FOR INSERT
  WITH CHECK (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);

CREATE POLICY "Admin can update config"
  ON admin_config FOR UPDATE
  USING (auth.uid() = 'f9977a91-793a-482d-beaf-823a61b0399d'::uuid);


-- ============ DISABLE SIGNUPS ============
-- Prevent anyone else from creating accounts
-- (Go to Supabase Dashboard > Auth > Settings > and turn OFF "Enable sign ups")
-- This SQL can't disable it — you need to toggle it in the dashboard.
