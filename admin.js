(function() {
  'use strict';

  var SUPABASE_URL = 'https://wzolxdvphhndfaytufdh.supabase.co';
  var SUPABASE_KEY = 'sb_publishable_dFBGBWuInL5Jz8JWZiMCFA_CeQQ8UX7';

  // Auth state
  var accessToken = null;
  var refreshToken = null;
  var currentUser = null;
  var refreshTimer = null;

  // Build headers — uses access token when authenticated, anon key otherwise
  function authHeaders(json) {
    var h = {
      'apikey': SUPABASE_KEY
    };
    if (accessToken) {
      h['Authorization'] = 'Bearer ' + accessToken;
    } else {
      h['Authorization'] = 'Bearer ' + SUPABASE_KEY;
    }
    if (json) {
      h['Content-Type'] = 'application/json';
      h['Prefer'] = 'return=representation';
    }
    return h;
  }

  // Current state
  var editingPostId = null;
  var coverImageUrl = null;

  // ========================================
  // AUTH — Supabase Auth via REST
  // ========================================

  function signIn(email, password) {
    return fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password })
    }).then(function(r) {
      if (!r.ok) {
        return r.json().then(function(err) {
          throw new Error(err.error_description || err.msg || 'sign in failed');
        });
      }
      return r.json();
    }).then(function(data) {
      setSession(data);
      return data;
    });
  }

  function signOut() {
    if (accessToken) {
      fetch(SUPABASE_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': 'Bearer ' + accessToken
        }
      }).catch(function() {});
    }
    clearSession();
    showGate();
  }

  function setSession(data) {
    accessToken = data.access_token;
    refreshToken = data.refresh_token;
    currentUser = data.user;

    // Schedule token refresh (refresh 60s before expiry)
    if (refreshTimer) clearTimeout(refreshTimer);
    var expiresIn = (data.expires_in || 3600) - 60;
    if (expiresIn < 60) expiresIn = 60;
    refreshTimer = setTimeout(doRefresh, expiresIn * 1000);
  }

  function clearSession() {
    accessToken = null;
    refreshToken = null;
    currentUser = null;
    if (refreshTimer) clearTimeout(refreshTimer);
  }

  function doRefresh() {
    if (!refreshToken) return;
    fetch(SUPABASE_URL + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refresh_token: refreshToken })
    }).then(function(r) {
      if (r.ok) return r.json();
      throw new Error('refresh failed');
    }).then(function(data) {
      setSession(data);
    }).catch(function() {
      clearSession();
      showGate();
    });
  }

  function resetPassword(email) {
    return fetch(SUPABASE_URL + '/auth/v1/recover', {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email
      })
    }).then(function(r) {
      if (!r.ok) {
        return r.json().then(function(err) {
          throw new Error(err.msg || 'reset failed');
        });
      }
      return true;
    });
  }

  // Update password using access token (after recovery redirect)
  function updatePassword(newPassword) {
    return fetch(SUPABASE_URL + '/auth/v1/user', {
      method: 'PUT',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ password: newPassword })
    }).then(function(r) {
      if (!r.ok) {
        return r.json().then(function(err) {
          throw new Error(err.msg || 'update failed');
        });
      }
      return r.json();
    });
  }

  // ========================================
  // PASSWORD GATE UI
  // ========================================

  function showGate() {
    document.getElementById('adminGate').style.display = '';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminPassword').value = '';
    document.getElementById('adminGateError').textContent = '';
    document.getElementById('adminPassword').focus();
  }

  function showPanel() {
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('adminPanel').style.display = '';
    loadPosts();
  }

  function initGate() {
    var input = document.getElementById('adminPassword');
    var emailInput = document.getElementById('adminEmail');
    var btn = document.getElementById('adminLoginBtn');
    var error = document.getElementById('adminGateError');
    var resetBtn = document.getElementById('adminResetBtn');

    function tryLogin() {
      var email = emailInput.value.trim();
      var pwd = input.value.trim();
      if (!email || !pwd) {
        error.textContent = 'enter email and password';
        return;
      }

      error.textContent = '';
      btn.disabled = true;
      btn.textContent = 'signing in...';

      signIn(email, pwd).then(function() {
        showPanel();
      }).catch(function(err) {
        error.textContent = err.message || 'sign in failed';
        btn.disabled = false;
        btn.textContent = 'enter';
        input.value = '';
        input.focus();
      });
    }

    btn.addEventListener('click', tryLogin);
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') tryLogin();
    });
    emailInput.addEventListener('keydown', function(e) {
      if (e.key === 'Enter') input.focus();
    });

    // Reset password
    resetBtn.addEventListener('click', function() {
      var email = emailInput.value.trim();
      if (!email) {
        error.textContent = 'enter your email first';
        return;
      }
      error.textContent = '';
      resetBtn.disabled = true;
      resetBtn.textContent = 'sending...';

      resetPassword(email).then(function() {
        error.textContent = 'check your email for a reset link';
        error.style.color = 'var(--green-dark)';
        resetBtn.disabled = false;
        resetBtn.textContent = 'reset password';
      }).catch(function(err) {
        error.textContent = err.message || 'reset failed';
        resetBtn.disabled = false;
        resetBtn.textContent = 'reset password';
      });
    });

    emailInput.focus();
  }

  // ========================================
  // POST MANAGEMENT
  // ========================================

  function loadPosts() {
    var list = document.getElementById('adminPostsList');
    list.innerHTML = '<div class="blog-loading">Loading posts</div>';

    // Authenticated user gets ALL posts (including drafts) via RLS
    fetch(SUPABASE_URL + '/rest/v1/blog_posts?select=*&order=published_date.desc', {
      headers: authHeaders()
    }).then(function(r) { return r.json(); }).then(function(posts) {
      if (!posts || !Array.isArray(posts) || posts.length === 0) {
        list.innerHTML = '<div class="blog-empty">No posts yet. Click "+ new post" to create one.</div>';
        return;
      }
      list.innerHTML = posts.map(function(p) {
        var topic = p.topic ? '<span class="admin-post-topic">' + esc(p.topic) + '</span>' : '';
        var draft = !p.is_published ? '<span class="admin-post-draft">draft</span>' : '';
        var date = p.published_date ? formatDate(p.published_date) : '';
        return '<div class="admin-post-row" data-id="' + p.id + '">' +
          '<div class="admin-post-info">' +
            '<div class="admin-post-title">' + esc(p.title) + '</div>' +
            '<div class="admin-post-meta">' +
              '<span class="admin-post-date">' + date + '</span>' +
              topic + draft +
            '</div>' +
          '</div>' +
        '</div>';
      }).join('');

      var rows = list.querySelectorAll('.admin-post-row');
      for (var i = 0; i < rows.length; i++) {
        (function(row) {
          row.addEventListener('click', function() {
            var id = row.getAttribute('data-id');
            var post = posts.find(function(p) { return p.id === id; });
            if (post) openEditor(post);
          });
        })(rows[i]);
      }
    }).catch(function() {
      list.innerHTML = '<div class="blog-empty">Could not load posts.</div>';
    });
  }

  // ---- Editor: Open ----
  function openEditor(post) {
    document.getElementById('adminListView').style.display = 'none';
    document.getElementById('adminEditorView').style.display = '';

    var isNew = !post;
    editingPostId = isNew ? null : post.id;
    coverImageUrl = null;

    document.getElementById('editorTitle').textContent = isNew ? 'new post' : 'edit post';
    document.getElementById('postTitle').value = isNew ? '' : (post.title || '');
    document.getElementById('postTopic').value = isNew ? '' : (post.topic || '');
    document.getElementById('postExcerpt').value = isNew ? '' : (post.excerpt || '');
    document.getElementById('postContent').value = isNew ? '' : (post.content || '');
    document.getElementById('postPublished').checked = isNew ? true : post.is_published;
    document.getElementById('editorDeleteBtn').style.display = isNew ? 'none' : '';
    document.getElementById('editorStatus').textContent = '';

    var dateInput = document.getElementById('postDate');
    if (isNew) {
      dateInput.value = new Date().toISOString().substring(0, 10);
    } else {
      dateInput.value = post.published_date ? post.published_date.substring(0, 10) : '';
    }

    var preview = document.getElementById('coverPreview');
    var dropzone = document.getElementById('coverDropzone');
    if (!isNew && post.cover_image) {
      coverImageUrl = post.cover_image;
      document.getElementById('coverPreviewImg').src = post.cover_image;
      preview.style.display = '';
      dropzone.style.display = 'none';
    } else {
      preview.style.display = 'none';
      dropzone.style.display = '';
    }

    document.getElementById('postTitle').focus();
  }

  // ---- Editor: Close ----
  function closeEditor() {
    document.getElementById('adminEditorView').style.display = 'none';
    document.getElementById('adminListView').style.display = '';
    document.getElementById('inlineImagePanel').style.display = 'none';
    editingPostId = null;
    coverImageUrl = null;
    loadPosts();
  }

  // ---- Editor: Save ----
  function savePost() {
    var title = document.getElementById('postTitle').value.trim();
    var topic = document.getElementById('postTopic').value.trim();
    var excerpt = document.getElementById('postExcerpt').value.trim();
    var content = document.getElementById('postContent').value.trim();
    var published = document.getElementById('postPublished').checked;
    var date = document.getElementById('postDate').value;
    var status = document.getElementById('editorStatus');

    if (!title) {
      status.textContent = 'title is required';
      status.className = 'admin-status error';
      return;
    }
    if (!content) {
      status.textContent = 'content is required';
      status.className = 'admin-status error';
      return;
    }

    var slug = title.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 80);

    var body = {
      title: title,
      topic: topic || null,
      slug: slug,
      content: content,
      excerpt: excerpt || null,
      cover_image: coverImageUrl || null,
      published_date: date || new Date().toISOString().substring(0, 10),
      is_published: published,
      updated_at: new Date().toISOString()
    };

    status.textContent = 'saving...';
    status.className = 'admin-status';

    var url, method;
    if (editingPostId) {
      url = SUPABASE_URL + '/rest/v1/blog_posts?id=eq.' + editingPostId;
      method = 'PATCH';
    } else {
      url = SUPABASE_URL + '/rest/v1/blog_posts';
      method = 'POST';
    }

    fetch(url, {
      method: method,
      headers: authHeaders(true),
      body: JSON.stringify(body)
    }).then(function(r) {
      if (r.ok) {
        return r.json().then(function(data) {
          if (data && data.length > 0) {
            editingPostId = data[0].id;
          }
          status.textContent = 'saved';
          status.className = 'admin-status success';
        });
      } else {
        return r.json().then(function(err) {
          if (err && err.message && err.message.indexOf('duplicate') > -1) {
            body.slug = slug + '-' + Date.now().toString(36);
            return fetch(url, {
              method: method,
              headers: authHeaders(true),
              body: JSON.stringify(body)
            }).then(function(r2) {
              if (r2.ok) {
                return r2.json().then(function(data) {
                  if (data && data.length > 0) editingPostId = data[0].id;
                  status.textContent = 'saved';
                  status.className = 'admin-status success';
                });
              } else {
                status.textContent = 'save failed';
                status.className = 'admin-status error';
              }
            });
          }
          status.textContent = 'save failed: ' + (err.message || 'unknown error');
          status.className = 'admin-status error';
        });
      }
    }).catch(function() {
      status.textContent = 'connection error';
      status.className = 'admin-status error';
    });
  }

  // ---- Editor: Delete ----
  function deletePost() {
    if (!editingPostId) return;
    if (!confirm('Delete this post? This cannot be undone.')) return;

    var status = document.getElementById('editorStatus');
    status.textContent = 'deleting...';
    status.className = 'admin-status';

    fetch(SUPABASE_URL + '/rest/v1/blog_posts?id=eq.' + editingPostId, {
      method: 'DELETE',
      headers: authHeaders()
    }).then(function(r) {
      if (r.ok) {
        closeEditor();
      } else {
        status.textContent = 'delete failed';
        status.className = 'admin-status error';
      }
    }).catch(function() {
      status.textContent = 'connection error';
      status.className = 'admin-status error';
    });
  }

  // ========================================
  // IMAGE UPLOAD
  // ========================================

  function uploadImage(file, callback) {
    if (!file || !file.type.startsWith('image/')) {
      callback(null, 'not an image file');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      callback(null, 'file too large (max 5MB)');
      return;
    }

    var ext = file.name.split('.').pop().toLowerCase();
    var filename = Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 8) + '.' + ext;

    fetch(SUPABASE_URL + '/storage/v1/object/blog-images/' + filename, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type': file.type
      },
      body: file
    }).then(function(r) {
      if (r.ok) {
        var publicUrl = SUPABASE_URL + '/storage/v1/object/public/blog-images/' + filename;
        callback(publicUrl, null);
      } else {
        r.json().then(function(err) {
          callback(null, err.message || 'upload failed');
        }).catch(function() {
          callback(null, 'upload failed');
        });
      }
    }).catch(function() {
      callback(null, 'connection error');
    });
  }

  // ---- Cover Image Handlers ----
  function initCoverUpload() {
    var dropzone = document.getElementById('coverDropzone');
    var fileInput = document.getElementById('coverFileInput');
    var preview = document.getElementById('coverPreview');
    var previewImg = document.getElementById('coverPreviewImg');
    var uploading = document.getElementById('coverUploading');
    var removeBtn = document.getElementById('coverRemoveBtn');

    dropzone.addEventListener('click', function() { fileInput.click(); });

    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function() {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      var file = e.dataTransfer.files[0];
      if (file) handleCoverFile(file);
    });

    fileInput.addEventListener('change', function() {
      if (fileInput.files[0]) handleCoverFile(fileInput.files[0]);
      fileInput.value = '';
    });

    removeBtn.addEventListener('click', function() {
      coverImageUrl = null;
      preview.style.display = 'none';
      dropzone.style.display = '';
    });

    function handleCoverFile(file) {
      dropzone.style.display = 'none';
      uploading.style.display = '';

      uploadImage(file, function(url, err) {
        uploading.style.display = 'none';
        if (url) {
          coverImageUrl = url;
          previewImg.src = url;
          preview.style.display = '';
        } else {
          dropzone.style.display = '';
          var status = document.getElementById('editorStatus');
          status.textContent = 'cover upload failed: ' + (err || 'unknown');
          status.className = 'admin-status error';
        }
      });
    }
  }

  // ---- Inline Image Handlers ----
  function initInlineUpload() {
    var panel = document.getElementById('inlineImagePanel');
    var dropzone = document.getElementById('inlineDropzone');
    var fileInput = document.getElementById('inlineFileInput');
    var uploading = document.getElementById('inlineUploading');

    dropzone.addEventListener('click', function() { fileInput.click(); });

    dropzone.addEventListener('dragover', function(e) {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', function() {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', function(e) {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      var file = e.dataTransfer.files[0];
      if (file) handleInlineFile(file);
    });

    fileInput.addEventListener('change', function() {
      if (fileInput.files[0]) handleInlineFile(fileInput.files[0]);
      fileInput.value = '';
    });

    function handleInlineFile(file) {
      dropzone.style.display = 'none';
      uploading.style.display = '';

      uploadImage(file, function(url, err) {
        uploading.style.display = 'none';
        dropzone.style.display = '';
        if (url) {
          var textarea = document.getElementById('postContent');
          var tag = '<img src="' + url + '" alt="">';
          insertAtCursor(textarea, tag);
          panel.style.display = 'none';
        } else {
          var status = document.getElementById('editorStatus');
          status.textContent = 'image upload failed: ' + (err || 'unknown');
          status.className = 'admin-status error';
        }
      });
    }
  }

  // ---- Toolbar ----
  function initToolbar() {
    var toolbar = document.querySelector('.admin-toolbar');
    if (!toolbar) return;

    toolbar.addEventListener('click', function(e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.getAttribute('data-action');
      var textarea = document.getElementById('postContent');

      switch (action) {
        case 'bold':
          wrapSelection(textarea, '<strong>', '</strong>');
          break;
        case 'italic':
          wrapSelection(textarea, '<em>', '</em>');
          break;
        case 'heading':
          wrapSelection(textarea, '<h2>', '</h2>');
          break;
        case 'quote':
          wrapSelection(textarea, '<blockquote>', '</blockquote>');
          break;
        case 'link':
          var url = prompt('Enter URL:');
          if (url) {
            var sel = getSelection(textarea);
            var text = sel || 'link text';
            insertAtCursor(textarea, '<a href="' + url + '">' + text + '</a>');
          }
          break;
        case 'image':
          var panel = document.getElementById('inlineImagePanel');
          panel.style.display = panel.style.display === 'none' ? '' : 'none';
          break;
      }
    });
  }

  // ---- Textarea Helpers ----
  function getSelection(textarea) {
    return textarea.value.substring(textarea.selectionStart, textarea.selectionEnd);
  }

  function wrapSelection(textarea, before, after) {
    var start = textarea.selectionStart;
    var end = textarea.selectionEnd;
    var sel = textarea.value.substring(start, end);
    var replacement = before + sel + after;
    textarea.setRangeText(replacement, start, end, 'select');
    textarea.focus();
  }

  function insertAtCursor(textarea, text) {
    var start = textarea.selectionStart;
    textarea.setRangeText(text, start, textarea.selectionEnd, 'end');
    textarea.focus();
  }

  // ---- Helpers ----
  function esc(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    var parts = dateStr.substring(0, 10).split('-');
    if (parts.length === 3) {
      var d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    } else {
      var d = new Date(dateStr);
    }
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
  }

  // ========================================
  // RECOVERY FLOW — handle #access_token from password reset email
  // ========================================

  function checkRecoveryToken() {
    var hash = window.location.hash;
    if (!hash || hash.indexOf('access_token') === -1) return false;

    // Parse hash params: #access_token=...&token_type=bearer&type=recovery...
    var params = {};
    hash.substring(1).split('&').forEach(function(pair) {
      var parts = pair.split('=');
      if (parts.length === 2) params[parts[0]] = decodeURIComponent(parts[1]);
    });

    if (params.type === 'recovery' && params.access_token) {
      // We have a valid recovery token — set it as our access token
      accessToken = params.access_token;
      if (params.refresh_token) refreshToken = params.refresh_token;

      // Clean the URL hash
      history.replaceState(null, '', window.location.pathname);

      return true;
    }
    return false;
  }

  function showPasswordReset() {
    // Hide gate and panel, show the reset form
    document.getElementById('adminGate').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'none';
    document.getElementById('adminResetView').style.display = '';

    var newPwd = document.getElementById('resetNewPassword');
    var confirmPwd = document.getElementById('resetConfirmPassword');
    var saveBtn = document.getElementById('resetSaveBtn');
    var status = document.getElementById('resetStatus');

    newPwd.focus();

    saveBtn.onclick = function() {
      var pwd = newPwd.value;
      var confirm = confirmPwd.value;
      status.textContent = '';
      status.className = 'admin-status';

      if (!pwd || pwd.length < 8) {
        status.textContent = 'password must be at least 8 characters';
        status.className = 'admin-status error';
        return;
      }
      if (pwd !== confirm) {
        status.textContent = 'passwords do not match';
        status.className = 'admin-status error';
        return;
      }

      saveBtn.disabled = true;
      saveBtn.textContent = 'saving...';

      updatePassword(pwd).then(function() {
        status.textContent = 'password updated — redirecting to login...';
        status.className = 'admin-status success';
        setTimeout(function() {
          clearSession();
          window.location.hash = '';
          window.location.reload();
        }, 1500);
      }).catch(function(err) {
        status.textContent = err.message || 'failed to update password';
        status.className = 'admin-status error';
        saveBtn.disabled = false;
        saveBtn.textContent = 'set password';
      });
    };
  }

  // ========================================
  // INIT
  // ========================================

  function init() {
    // Check if this is a recovery redirect (password reset link clicked)
    var isRecovery = checkRecoveryToken();
    if (isRecovery) {
      showPasswordReset();
      return;
    }

    initGate();
    initCoverUpload();
    initInlineUpload();
    initToolbar();

    document.getElementById('newPostBtn').addEventListener('click', function() {
      openEditor(null);
    });
    document.getElementById('editorCancelBtn').addEventListener('click', closeEditor);
    document.getElementById('editorSaveBtn').addEventListener('click', savePost);
    document.getElementById('editorDeleteBtn').addEventListener('click', deletePost);

    // Sign out button
    var signOutBtn = document.getElementById('adminSignOutBtn');
    if (signOutBtn) {
      signOutBtn.addEventListener('click', signOut);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
