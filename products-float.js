/* ========================================
   PRODUCTS-FLOAT.JS — Floating Draggable Product Icons
   Mirrors hub-float.js animation pattern (organic drift +
   hold-and-drag) but tuned for the basket area on
   the products page. Two icons, positioned above the basket.
   ======================================== */

(function () {
  'use strict';

  var area = document.getElementById('productsFloatArea');
  if (!area) return;

  var icons = Array.from(area.querySelectorAll('.product-icon'));
  if (icons.length === 0) return;

  // ---- Layout configuration ----
  var isMobile = window.innerWidth <= 600;
  // Desktop: 1.0x. Mobile: 0.7x base, +20% per request = 0.84x.
  var scale = isMobile ? 0.84 : 1;

  // Position icons above the basket. homeX/homeY are offsets from the
  // CENTER of the basket area (negative = left/up). Icons live in the
  // upper half so they hover above the basket rim.
  //
  // Desktop: side-by-side, both above the basket.
  // Mobile: vertically stacked with horizontal offset — plugin higher
  // and slightly left, editing pack lower and slightly right. Fills
  // the tall narrow space better than side-by-side.
  var iconConfigs = [
    { // plugin (SD card) — higher, slight left
      homeX: isMobile ? -0.22 : -0.22,
      homeY: isMobile ? -0.32 : -0.28,
      width: Math.round(216 * scale), height: Math.round(264 * scale),
      rotation: -4.5,
      floatAmpX: 4, floatAmpY: 5,
      floatSpeedX: 0.0009, floatSpeedY: 0.0012,
      floatPhaseX: 0, floatPhaseY: 0.7,
    },
    { // editing pack (blue box) — lower, slight right
      homeX: isMobile ? 0.24 : 0.22,
      homeY: isMobile ? -0.06 : -0.22,
      width: Math.round(240 * scale), height: Math.round(264 * scale),
      rotation: 3.5,
      floatAmpX: 5, floatAmpY: 3.5,
      floatSpeedX: 0.0011, floatSpeedY: 0.0008,
      floatPhaseX: 1.8, floatPhaseY: 2.3,
    },
  ];

  var iconStates = [];

  // ---- Initialize icons ----
  function initIcons() {
    var areaRect = area.getBoundingClientRect();
    var centerX = areaRect.width / 2;
    var centerY = areaRect.height / 2;

    icons.forEach(function (icon, i) {
      var cfg = iconConfigs[i] || iconConfigs[0];

      var homeX = centerX + cfg.homeX * areaRect.width - cfg.width / 2;
      var homeY = centerY + cfg.homeY * areaRect.height - cfg.height / 2;

      icon.style.position = 'absolute';
      icon.style.width = cfg.width + 'px';
      icon.style.height = cfg.height + 'px';
      icon.style.left = '0px';
      icon.style.top = '0px';
      icon.style.willChange = 'transform';
      icon.style.touchAction = 'none';
      icon.style.userSelect = 'none';
      icon.style.webkitUserSelect = 'none';

      var state = {
        index: i,
        el: icon,
        cfg: cfg,
        homeX: homeX,
        homeY: homeY,
        currentX: homeX,
        currentY: homeY,
        dragOffsetX: 0,
        dragOffsetY: 0,
        rotation: cfg.rotation,
        isDragging: false,
        wasDragged: false,
        dragStartTime: 0,
        isHovered: false,
        hoverLift: 0,
      };

      iconStates.push(state);
      updateIconTransform(state, 0);
    });
  }

  function updateIconTransform(state, time) {
    var x = state.currentX;
    var y = state.currentY;
    var rot = state.rotation;

    if (!state.isDragging) {
      var cfg = state.cfg;
      x += Math.sin(time * cfg.floatSpeedX + cfg.floatPhaseX) * cfg.floatAmpX;
      y += Math.sin(time * cfg.floatSpeedY + cfg.floatPhaseY) * cfg.floatAmpY;
      rot = cfg.rotation + Math.sin(time * 0.0004 + cfg.floatPhaseX) * 0.6;
    }

    // Smooth hover lift — lerp toward target
    var liftTarget = state.isHovered && !state.isDragging ? -6 : 0;
    state.hoverLift += (liftTarget - state.hoverLift) * 0.15;
    if (Math.abs(state.hoverLift - liftTarget) < 0.1) state.hoverLift = liftTarget;
    y += state.hoverLift;

    state.el.style.transform =
      'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
  }

  // ---- Animation loop ----
  function animate(time) {
    for (var i = 0; i < iconStates.length; i++) {
      updateIconTransform(iconStates[i], time);
    }
    requestAnimationFrame(animate);
  }

  // ---- Drag handling ----
  var activeState = null;

  function getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
      return { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
    return { x: e.clientX, y: e.clientY };
  }

  function onPointerDown(e) {
    var icon = e.target.closest('.product-icon');
    if (!icon) return;

    var idx = parseInt(icon.getAttribute('data-float-index'));
    var state = iconStates[idx];
    if (!state) return;

    var pos = getPointerPos(e);
    var areaRect = area.getBoundingClientRect();

    state.isDragging = true;
    state.wasDragged = false;
    state.dragStartTime = Date.now();
    state.dragOffsetX = pos.x - areaRect.left - state.currentX;
    state.dragOffsetY = pos.y - areaRect.top - state.currentY;
    activeState = state;

    icon.style.zIndex = '50';
    icon.style.cursor = 'grabbing';
    e.preventDefault();
  }

  function onPointerMove(e) {
    if (!activeState) return;

    var pos = getPointerPos(e);
    var areaRect = area.getBoundingClientRect();

    activeState.currentX = pos.x - areaRect.left - activeState.dragOffsetX;
    activeState.currentY = pos.y - areaRect.top - activeState.dragOffsetY;
    activeState.wasDragged = true;
    activeState.rotation = activeState.cfg.rotation;
    e.preventDefault();
  }

  function onPointerUp(e) {
    if (!activeState) return;

    activeState.isDragging = false;
    activeState.el.style.zIndex = '';
    activeState.el.style.cursor = '';

    var elapsed = Date.now() - activeState.dragStartTime;
    var isClick = !activeState.wasDragged || elapsed < 200;

    if (isClick) {
      var icon = activeState.el;
      var href = icon.getAttribute('href');
      if (href && href !== '#') {
        // External links open in new tab
        if (href.indexOf('http') === 0 && href.indexOf(window.location.hostname) === -1) {
          window.open(href, '_blank', 'noopener,noreferrer');
        } else {
          window.location.href = href;
        }
      }
    }

    activeState = null;
  }

  // Mouse events
  area.addEventListener('mousedown', onPointerDown);
  window.addEventListener('mousemove', onPointerMove);
  window.addEventListener('mouseup', onPointerUp);

  // Touch events
  area.addEventListener('touchstart', onPointerDown, { passive: false });
  window.addEventListener('touchmove', onPointerMove, { passive: false });
  window.addEventListener('touchend', onPointerUp);

  // Hover detection for smooth JS-driven lift
  icons.forEach(function (icon) {
    icon.addEventListener('mouseenter', function () {
      var idx = parseInt(icon.getAttribute('data-float-index'));
      if (iconStates[idx]) iconStates[idx].isHovered = true;
    });
    icon.addEventListener('mouseleave', function () {
      var idx = parseInt(icon.getAttribute('data-float-index'));
      if (iconStates[idx]) iconStates[idx].isHovered = false;
    });
  });

  // Prevent default click when dragged (let the drag-aware handler decide)
  icons.forEach(function (icon) {
    icon.addEventListener('click', function (e) {
      var idx = parseInt(icon.getAttribute('data-float-index'));
      var state = iconStates[idx];
      if (state && state.wasDragged) {
        e.preventDefault();
      }
    });
  });

  // ---- Handle resize ----
  var resizeTimer;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () {
      var areaRect = area.getBoundingClientRect();
      var centerX = areaRect.width / 2;
      var centerY = areaRect.height / 2;

      iconStates.forEach(function (state) {
        var cfg = state.cfg;
        state.homeX = centerX + cfg.homeX * areaRect.width - cfg.width / 2;
        state.homeY = centerY + cfg.homeY * areaRect.height - cfg.height / 2;
        state.currentX = state.homeX;
        state.currentY = state.homeY;
      });
    }, 150);
  });

  // ---- Reduced motion ----
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---- Start ----
  initIcons();

  if (prefersReduced) {
    for (var i = 0; i < iconStates.length; i++) {
      updateIconTransform(iconStates[i], 0);
    }
  } else {
    requestAnimationFrame(animate);
  }
})();
