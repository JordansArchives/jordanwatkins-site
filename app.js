/* ========================================
   APP.JS — Jordan's Archives
   Sidebar toggle, collapse, smooth scroll, scroll spy
   ======================================== */

(function () {
  'use strict';

  // --- Sidebar Elements ---
  var sidebar = document.getElementById('sidebar');
  var sidebarToggle = document.getElementById('sidebarToggle');
  var sidebarOverlay = document.getElementById('sidebarOverlay');
  var collapseToggle = document.getElementById('sidebarCollapseToggle');

  // --- Mobile Sidebar Toggle ---
  if (sidebarToggle && sidebar && sidebarOverlay) {
    function openSidebar() {
      sidebar.classList.add('open');
      sidebarOverlay.classList.add('active');
      sidebarOverlay.style.display = 'block';
      document.body.style.overflow = 'hidden';
    }

    function closeSidebar() {
      sidebar.classList.remove('open');
      sidebarOverlay.classList.remove('active');
      document.body.style.overflow = '';
      setTimeout(function () {
        if (!sidebarOverlay.classList.contains('active')) {
          sidebarOverlay.style.display = 'none';
        }
      }, 300);
    }

    sidebarToggle.addEventListener('click', function () {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });

    sidebarOverlay.addEventListener('click', closeSidebar);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sidebar.classList.contains('open')) {
        closeSidebar();
      }
    });

    var resizeTimeout;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(function () {
        if (window.innerWidth > 768 && sidebar.classList.contains('open')) {
          closeSidebar();
        }
      }, 100);
    });
  }

  // --- Desktop Sidebar Collapse ---
  if (collapseToggle && sidebar) {
    // Sidebar starts expanded by default (no persistence needed for static hosting)
    collapseToggle.addEventListener('click', function () {
      sidebar.classList.toggle('collapsed');
    });
  }

  // --- Highlight Active Sidebar Link ---
  var currentPage = window.location.pathname.split('/').pop() || 'index.html';
  var sidebarLinks = document.querySelectorAll('.sidebar-link');

  sidebarLinks.forEach(function (link) {
    var href = link.getAttribute('href');
    if (href === currentPage) {
      link.classList.add('active');
    }

    // Handle anchor links (smooth scroll on tools.html)
    link.addEventListener('click', function (e) {
      var linkHref = this.getAttribute('href');
      if (linkHref && linkHref.startsWith('#')) {
        e.preventDefault();
        var target = document.querySelector(linkHref);
        if (target) {
          if (sidebar && sidebar.classList.contains('open')) {
            sidebar.classList.remove('open');
            if (sidebarOverlay) {
              sidebarOverlay.classList.remove('active');
              sidebarOverlay.style.display = 'none';
            }
            document.body.style.overflow = '';
          }
          var topbarHeight = 52;
          var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - topbarHeight;
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
          sidebarLinks.forEach(function (l) { l.classList.remove('active'); });
          this.classList.add('active');
        }
      }
    });
  });

  // --- Animate elements on scroll (subtle fade-in) ---
  if ('IntersectionObserver' in window) {
    var observerOptions = {
      threshold: 0.05,
      rootMargin: '50px 0px 0px 0px'
    };

    var fadeObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          fadeObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.category-section').forEach(function (section) {
      section.classList.add('fade-in');
      fadeObserver.observe(section);
    });
  }
})();
