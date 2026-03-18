(function() {
  'use strict';

  var SUPABASE_URL = 'https://wzolxdvphhndfaytufdh.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_dFBGBWuInL5Jz8JWZiMCFA_CeQQ8UX7';

  var headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': 'Bearer ' + SUPABASE_KEY
  };

  function fetchPosts() {
    return fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=*&is_published=eq.true&order=published_date.desc', {
      headers: headers
    }).then(function(r) { return r.json(); });
  }

  function fetchPost(slug) {
    return fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=*&slug=eq.' + encodeURIComponent(slug) + '&limit=1', {
      headers: headers
    }).then(function(r) { return r.json(); }).then(function(d) { return d[0]; });
  }

  function fetchComments(postId) {
    return fetch(SUPABASE_URL + '/rest/v1/blog_comments?select=*&post_id=eq.' + postId + '&order=created_at.desc', {
      headers: headers
    }).then(function(r) { return r.json(); });
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    // Handle date-only strings (YYYY-MM-DD) by parsing as local, not UTC
    var parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
      var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      var d = new Date(dateStr);
    }
    var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function buildXpCard(post) {
    var title = escapeHtml(post.title || 'Untitled');
    var excerpt = escapeHtml(post.excerpt || '');
    var topic = post.topic ? '<span class="xp-topic-tag">' + escapeHtml(post.topic) + '</span>' : '';
    var date = post.published_date ? '<span class="xp-date">' + formatDate(post.published_date) + '</span>' : '';

    return '<a href="blog-post.html?slug=' + encodeURIComponent(post.slug) + '" class="xp-card">' +
      '<div class="xp-titlebar">' +
        '<span class="xp-titlebar-text">' + title + '</span>' +
        '<div class="xp-titlebar-buttons">' +
          '<span class="xp-btn">_</span>' +
          '<span class="xp-btn">\u25A1</span>' +
          '<span class="xp-btn">\u00D7</span>' +
        '</div>' +
      '</div>' +
      '<div class="xp-body">' +
        '<p class="xp-body-excerpt">' + excerpt + '</p>' +
        '<div class="xp-body-meta">' + topic + date + '</div>' +
      '</div>' +
    '</a>';
  }

  // ---- Blog Listing Page ----
  function renderBlogGrid() {
    var grid = document.getElementById('blogGrid');
    if (!grid) return;

    grid.innerHTML = '<div class="blog-loading">Loading posts</div>';

    fetchPosts().then(function(posts) {
      if (!posts || posts.length === 0) {
        grid.innerHTML = '<div class="blog-empty">No posts yet. Check back soon.</div>';
        return;
      }
      grid.innerHTML = posts.map(buildXpCard).join('');
    }).catch(function() {
      grid.innerHTML = '<div class="blog-empty">Could not load posts. Please try again later.</div>';
    });
  }

  // ---- Individual Post Page ----
  function renderPostPage() {
    var container = document.getElementById('postContent');
    var commentsContainer = document.getElementById('postComments');
    if (!container) return;

    var params = new URLSearchParams(window.location.search);
    var slug = params.get('slug');

    if (!slug) {
      container.innerHTML = '<div class="post-error">No post specified.</div>';
      return;
    }

    container.innerHTML = '<div class="post-loading">Loading</div>';

    fetchPost(slug).then(function(post) {
      if (!post) {
        container.innerHTML = '<div class="post-error">Post not found.</div>';
        return;
      }

      // Update page title
      document.title = (post.title || 'Post') + ' — Jordan\'s Archives';

      // Update the XP title bar text
      var titlebar = document.querySelector('.xp-titlebar-text');
      if (titlebar) titlebar.textContent = post.title || 'Untitled';

      // Build post body
      var html = '';

      // Meta line
      var topic = post.topic ? '<span class="xp-topic-tag">' + escapeHtml(post.topic) + '</span>' : '';
      var date = post.published_date ? '<span class="xp-date">' + formatDate(post.published_date) + '</span>' : '';
      if (topic || date) {
        html += '<div class="post-meta">' + topic + date + '</div>';
      }

      // Cover image
      if (post.cover_image) {
        html += '<img src="' + escapeHtml(post.cover_image) + '" alt="" class="post-cover">';
      }

      // Content
      html += '<div class="post-content">' + (post.content || '') + '</div>';

      container.innerHTML = html;

      // Fetch comments
      if (commentsContainer && post.id) {
        fetchComments(post.id).then(function(comments) {
          if (!comments || comments.length === 0) {
            commentsContainer.innerHTML =
              '<hr class="post-divider">' +
              '<div class="post-comments-section">' +
                '<h3 class="post-comments-title">Updates &amp; Notes</h3>' +
                '<p class="post-no-comments">No updates yet.</p>' +
              '</div>';
            return;
          }
          var commentsHtml = '<hr class="post-divider">' +
            '<div class="post-comments-section">' +
              '<h3 class="post-comments-title">Updates &amp; Notes</h3>' +
              comments.map(function(c) {
                return '<div class="post-comment">' +
                  '<div class="post-comment-date">' + formatDate(c.created_at) + '</div>' +
                  '<div class="post-comment-body">' + (c.content || '') + '</div>' +
                '</div>';
              }).join('') +
            '</div>';
          commentsContainer.innerHTML = commentsHtml;
        }).catch(function() {
          commentsContainer.innerHTML = '';
        });
      }
    }).catch(function() {
      container.innerHTML = '<div class="post-error">Could not load post. Please try again later.</div>';
    });
  }

  // ---- Init ----
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    renderBlogGrid();
    renderPostPage();
  }

  window.BlogAPI = { fetchPosts: fetchPosts, fetchPost: fetchPost, fetchComments: fetchComments };
})();
