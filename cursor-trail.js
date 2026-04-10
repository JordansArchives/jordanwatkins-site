/* ========================================
   CURSOR-TRAIL.JS — Custom spring cursor
   Single filled circle with spring physics,
   magnetic snap + squash/stretch on hub cards.
   mix-blend-mode: difference for color inversion.
   Desktop only — hidden on touch devices.
   ======================================== */

(function () {
  'use strict';

  // Skip on touch/mobile
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var isMobile = window.matchMedia('(hover: none)').matches || window.innerWidth <= 768;
  if (isTouch || isMobile) return;

  // ---- Config ----
  var DEFAULT_SIZE = 30;
  var HOVER_SIZE = 50;
  var MAGNETIC_PULL = 0.1;
  var SPRING_CONFIG = { stiffness: 300, damping: 20, mass: 0.5 };

  // Only hub cards get the sticky/magnetic snap behavior
  var STICKY = '.hub-card';

  // ---- Spring physics ----
  function Spring(config) {
    this.k = config.stiffness;
    this.d = config.damping;
    this.m = config.mass;
    this.pos = 0;
    this.vel = 0;
    this.target = 0;
  }

  Spring.prototype.set = function (target) {
    this.target = target;
  };

  Spring.prototype.snap = function (value) {
    this.pos = value;
    this.vel = 0;
    this.target = value;
  };

  Spring.prototype.update = function (dt) {
    var displacement = this.pos - this.target;
    var force = -this.k * displacement - this.d * this.vel;
    this.vel += (force / this.m) * dt;
    this.pos += this.vel * dt;
  };

  // ---- Helpers ----
  function mapRange(value, inMin, inMax, outMin, outMax) {
    var t = Math.min(Math.max((value - inMin) / (inMax - inMin), 0), 1);
    return outMin + t * (outMax - outMin);
  }

  // ---- Create cursor element ----
  var cursor = document.createElement('div');
  cursor.className = 'cursor-dot';
  cursor.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: ' + DEFAULT_SIZE + 'px',
    'height: ' + DEFAULT_SIZE + 'px',
    'background: #49C7A0',
    'border-radius: 50%',
    'pointer-events: none',
    'z-index: 9999',
    'opacity: 0',
    'mix-blend-mode: difference',
    'will-change: transform',
    'transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease',
  ].join(';');
  document.body.appendChild(cursor);

  // ---- Cursor-dot styles (no hiding of native cursor) ----
  var style = document.createElement('style');
  style.textContent = [
    '@media (hover: none), (max-width: 768px) {',
    '  .cursor-dot { display: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  // ---- State ----
  var springX = new Spring(SPRING_CONFIG);
  var springY = new Spring(SPRING_CONFIG);
  var mouseX = 0;
  var mouseY = 0;
  var visible = false;
  var hoveredEl = null;
  var size = DEFAULT_SIZE;
  var angle = 0;
  var scaleX = 1;
  var scaleY = 1;

  // ---- Mouse events ----
  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      springX.snap(mouseX - size / 2);
      springY.snap(mouseY - size / 2);
      cursor.style.opacity = '1';
    }
  });

  document.addEventListener('mouseleave', function () {
    visible = false;
    cursor.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    if (mouseX > 0 || mouseY > 0) {
      visible = true;
      cursor.style.opacity = '1';
    }
  });

  // ---- Hover detection (sticky only on hub cards) ----
  document.addEventListener('mouseover', function (e) {
    var target = e.target.closest(STICKY);
    if (target) {
      hoveredEl = target;
      size = HOVER_SIZE;
      cursor.style.width = HOVER_SIZE + 'px';
      cursor.style.height = HOVER_SIZE + 'px';
    }
  });

  document.addEventListener('mouseout', function (e) {
    var target = e.target.closest(STICKY);
    if (target) {
      var related = e.relatedTarget;
      if (related && related.closest && related.closest(STICKY)) {
        hoveredEl = related.closest(STICKY);
        return;
      }
      hoveredEl = null;
      size = DEFAULT_SIZE;
      cursor.style.width = DEFAULT_SIZE + 'px';
      cursor.style.height = DEFAULT_SIZE + 'px';
    }
  });

  // ---- Animation loop ----
  var lastTime = 0;

  function animate(time) {
    // Delta time in seconds, capped to prevent spiral on tab-switch
    var dt = lastTime ? Math.min((time - lastTime) / 1000, 0.05) : 1 / 60;
    lastTime = time;

    if (hoveredEl) {
      // Sticky mode: magnetic snap + squash/stretch
      var rect = hoveredEl.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;
      var ox = mouseX - cx;
      var oy = mouseY - cy;

      // Target: element center + small % of mouse offset
      springX.set(cx + MAGNETIC_PULL * ox - size / 2);
      springY.set(cy + MAGNETIC_PULL * oy - size / 2);

      // Rotate toward mouse direction
      angle = Math.atan2(oy, ox);

      // Squash/stretch based on distance from center
      var dist = Math.max(Math.abs(ox), Math.abs(oy));
      scaleX = mapRange(dist, 0, rect.height / 2, 1, 1.3);
      scaleY = mapRange(dist, 0, rect.width / 2, 1, 0.8);
    } else {
      // Normal mode: follow mouse
      springX.set(mouseX - size / 2);
      springY.set(mouseY - size / 2);

      // Ease transforms back to neutral
      scaleX += (1 - scaleX) * 0.15;
      scaleY += (1 - scaleY) * 0.15;
      angle *= 0.85;
    }

    // Step spring physics
    springX.update(dt);
    springY.update(dt);

    // Apply transform
    cursor.style.transform =
      'translate(' + springX.pos.toFixed(1) + 'px, ' + springY.pos.toFixed(1) + 'px)' +
      ' rotate(' + angle.toFixed(3) + 'rad)' +
      ' scaleX(' + scaleX.toFixed(3) + ')' +
      ' scaleY(' + scaleY.toFixed(3) + ')';

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
})();
