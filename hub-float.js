/* ========================================
   HUB-FLOAT.JS — Floating Draggable Cards
   Organic drift + hold-and-drag interaction
   ======================================== */

(function () {
  'use strict';

  var area = document.getElementById('hubFloatArea');
  if (!area) return;

  var cards = Array.from(area.querySelectorAll('.hub-card'));
  if (cards.length === 0) return;

  // ---- Layout configuration ----
  var isMobile = window.innerWidth <= 600;
  var scale = isMobile ? 0.65 : 1;

  var cardConfigs = [
    { // tools — top-left-ish
      homeX: -0.20, homeY: -0.22,
      width: Math.round(260 * scale), height: Math.round(100 * scale),
      rotation: -1.8,
      floatAmpX: 3, floatAmpY: 4,
      floatSpeedX: 0.0008, floatSpeedY: 0.0011,
      floatPhaseX: 0, floatPhaseY: 0.5,
    },
    { // arkives — top-right-ish
      homeX: 0.16, homeY: -0.14,
      width: Math.round(200 * scale), height: Math.round(100 * scale),
      rotation: 1.2,
      floatAmpX: 4, floatAmpY: 3,
      floatSpeedX: 0.0012, floatSpeedY: 0.0007,
      floatPhaseX: 1.2, floatPhaseY: 2.1,
    },
    { // about — bottom-left-ish
      homeX: -0.15, homeY: 0.12,
      width: Math.round(230 * scale), height: Math.round(100 * scale),
      rotation: 0.7,
      floatAmpX: 3.5, floatAmpY: 5,
      floatSpeedX: 0.0009, floatSpeedY: 0.001,
      floatPhaseX: 2.5, floatPhaseY: 0.8,
    },
    { // products — bottom-right-ish
      homeX: 0.18, homeY: 0.16,
      width: Math.round(190 * scale), height: Math.round(100 * scale),
      rotation: -2.3,
      floatAmpX: 5, floatAmpY: 3,
      floatSpeedX: 0.0011, floatSpeedY: 0.0013,
      floatPhaseX: 3.8, floatPhaseY: 1.5,
    },
  ];

  // State for each card
  var cardStates = [];

  // ---- Initialize cards ----
  function initCards() {
    var areaRect = area.getBoundingClientRect();
    var centerX = areaRect.width / 2;
    var centerY = areaRect.height / 2;

    cards.forEach(function (card, i) {
      var cfg = cardConfigs[i] || cardConfigs[0];

      var homeX = centerX + cfg.homeX * areaRect.width - cfg.width / 2;
      var homeY = centerY + cfg.homeY * areaRect.height - cfg.height / 2;

      card.style.position = 'absolute';
      card.style.width = cfg.width + 'px';
      card.style.height = cfg.height + 'px';
      card.style.left = '0px';
      card.style.top = '0px';
      card.style.willChange = 'transform';
      card.style.touchAction = 'none';
      card.style.userSelect = 'none';
      card.style.webkitUserSelect = 'none';

      var state = {
        index: i,
        el: card,
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

      cardStates.push(state);
      updateCardTransform(state, 0);
    });
  }

  function updateCardTransform(state, time) {
    var x = state.currentX;
    var y = state.currentY;
    var rot = state.rotation;

    if (!state.isDragging) {
      var cfg = state.cfg;
      x += Math.sin(time * cfg.floatSpeedX + cfg.floatPhaseX) * cfg.floatAmpX;
      y += Math.sin(time * cfg.floatSpeedY + cfg.floatPhaseY) * cfg.floatAmpY;
      rot = cfg.rotation + Math.sin(time * 0.0004 + cfg.floatPhaseX) * 0.5;
    }

    // Smooth hover lift — lerp toward target
    var liftTarget = state.isHovered && !state.isDragging ? -5 : 0;
    state.hoverLift += (liftTarget - state.hoverLift) * 0.15;
    if (Math.abs(state.hoverLift - liftTarget) < 0.1) state.hoverLift = liftTarget;
    y += state.hoverLift;

    state.el.style.transform =
      'translate(' + x.toFixed(1) + 'px, ' + y.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';
  }

  // ---- Animation loop ----
  var animRunning = true;

  function animate(time) {
    if (!animRunning) return;
    for (var i = 0; i < cardStates.length; i++) {
      updateCardTransform(cardStates[i], time);
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
    var card = e.target.closest('.hub-card');
    if (!card) return;

    var idx = parseInt(card.getAttribute('data-float-index'));
    var state = cardStates[idx];
    if (!state) return;

    var pos = getPointerPos(e);
    var areaRect = area.getBoundingClientRect();

    state.isDragging = true;
    state.wasDragged = false;
    state.dragStartTime = Date.now();
    state.dragOffsetX = pos.x - areaRect.left - state.currentX;
    state.dragOffsetY = pos.y - areaRect.top - state.currentY;
    activeState = state;

    card.style.zIndex = '50';
    card.style.cursor = 'pointer';
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
      var card = activeState.el;
      var href = card.getAttribute('href');
      if (href && href !== '#') {
        window.location.href = href;
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
  cards.forEach(function (card) {
    card.addEventListener('mouseenter', function () {
      var idx = parseInt(card.getAttribute('data-float-index'));
      if (cardStates[idx]) cardStates[idx].isHovered = true;
    });
    card.addEventListener('mouseleave', function () {
      var idx = parseInt(card.getAttribute('data-float-index'));
      if (cardStates[idx]) cardStates[idx].isHovered = false;
    });
  });

  // Prevent default click on cards when dragged
  cards.forEach(function (card) {
    card.addEventListener('click', function (e) {
      var idx = parseInt(card.getAttribute('data-float-index'));
      var state = cardStates[idx];
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

      cardStates.forEach(function (state) {
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
  initCards();

  if (prefersReduced) {
    for (var i = 0; i < cardStates.length; i++) {
      updateCardTransform(cardStates[i], 0);
    }
  } else {
    requestAnimationFrame(animate);
  }
})();
