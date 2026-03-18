/* ========================================
   CURSOR-TRAIL.JS — Custom cursor
   Inspired by colelee.art: filled dot with
   mix-blend-mode difference + trailing ring.
   Desktop only — hidden on touch devices.
   ======================================== */

(function () {
  'use strict';

  // Skip on touch/mobile devices
  var isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  var isMobile = window.matchMedia('(hover: none)').matches || window.innerWidth <= 768;
  if (isTouch || isMobile) return;

  // Create the inner dot — small filled circle, inverts colors
  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  dot.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 8px',
    'height: 8px',
    'background: var(--green-dark, #1a2d14)',
    'border-radius: 50%',
    'pointer-events: none',
    'z-index: 9999',
    'opacity: 0',
    'mix-blend-mode: difference',
    'transform: translate(-50%, -50%)',
    'will-change: transform',
    'transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease',
  ].join(';');
  document.body.appendChild(dot);

  // Create the outer ring — larger hollow circle, trails behind
  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.style.cssText = [
    'position: fixed',
    'top: 0',
    'left: 0',
    'width: 40px',
    'height: 40px',
    'border: 1px solid var(--green-dark, #1a2d14)',
    'border-radius: 50%',
    'pointer-events: none',
    'z-index: 9998',
    'opacity: 0',
    'transform: translate(-50%, -50%)',
    'will-change: transform',
    'transition: width 0.3s ease, height 0.3s ease, opacity 0.3s ease, border-color 0.3s ease',
  ].join(';');
  document.body.appendChild(ring);

  // Hide native cursor
  var style = document.createElement('style');
  style.textContent = [
    '*, *::before, *::after { cursor: none !important; }',
    '@media (hover: none), (max-width: 768px) {',
    '  *, *::before, *::after { cursor: auto !important; }',
    '  .cursor-dot, .cursor-ring { display: none !important; }',
    '}',
  ].join('\n');
  document.head.appendChild(style);

  var mouseX = 0;
  var mouseY = 0;
  var dotX = 0;
  var dotY = 0;
  var ringX = 0;
  var ringY = 0;
  var visible = false;

  document.addEventListener('mousemove', function (e) {
    mouseX = e.clientX;
    mouseY = e.clientY;
    if (!visible) {
      visible = true;
      dot.style.opacity = '1';
      ring.style.opacity = '0.4';
    }
  });

  document.addEventListener('mouseleave', function () {
    visible = false;
    dot.style.opacity = '0';
    ring.style.opacity = '0';
  });

  document.addEventListener('mouseenter', function () {
    if (mouseX > 0 || mouseY > 0) {
      visible = true;
      dot.style.opacity = '1';
      ring.style.opacity = '0.4';
    }
  });

  // Hover detection — grow on interactive elements
  var hovering = false;

  document.addEventListener('mouseover', function (e) {
    var target = e.target.closest('a, button, [role="button"], input, textarea, select, label[for], .card, .hub-card, .sidebar-link, .tool-card');
    if (target && !hovering) {
      hovering = true;
      dot.style.width = '16px';
      dot.style.height = '16px';
      ring.style.width = '60px';
      ring.style.height = '60px';
      ring.style.borderColor = 'var(--red, #a82226)';
      ring.style.opacity = '0.3';
    }
  });

  document.addEventListener('mouseout', function (e) {
    var target = e.target.closest('a, button, [role="button"], input, textarea, select, label[for], .card, .hub-card, .sidebar-link, .tool-card');
    if (target && hovering) {
      // Check if we're still inside another interactive element
      var related = e.relatedTarget;
      if (related && related.closest && related.closest('a, button, [role="button"], input, textarea, select, label[for], .card, .hub-card, .sidebar-link, .tool-card')) {
        return;
      }
      hovering = false;
      dot.style.width = '8px';
      dot.style.height = '8px';
      ring.style.width = '40px';
      ring.style.height = '40px';
      ring.style.borderColor = 'var(--green-dark, #1a2d14)';
      ring.style.opacity = '0.4';
    }
  });

  // Animation loop — lerp for smooth trailing
  function animate() {
    // Dot: 20% lerp — snappy but smooth
    dotX += (mouseX - dotX) * 0.2;
    dotY += (mouseY - dotY) * 0.2;
    // Ring: 8% lerp — lazy, floaty trail
    ringX += (mouseX - ringX) * 0.08;
    ringY += (mouseY - ringY) * 0.08;

    dot.style.transform = 'translate(calc(-50% + ' + dotX.toFixed(1) + 'px), calc(-50% + ' + dotY.toFixed(1) + 'px))';
    ring.style.transform = 'translate(calc(-50% + ' + ringX.toFixed(1) + 'px), calc(-50% + ' + ringY.toFixed(1) + 'px))';

    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
})();
