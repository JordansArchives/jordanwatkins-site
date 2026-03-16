/* ========================================
   CONTACT-FLOAT.JS — About page contact button drift
   Same sinusoidal floating as hub cards
   ======================================== */

(function () {
  'use strict';

  var btn = document.getElementById('contactBtn');
  if (!btn) return;

  // Float parameters (matching hub-float.js style)
  var ampX = 4;
  var ampY = 5;
  var speedX = 0.0009;
  var speedY = 0.0012;
  var phaseX = 1.7;
  var phaseY = 0.4;
  var rotBase = -0.8;

  var running = true;

  // Expose pause/resume so contact-card.js can stop drift during flip
  window._contactFloat = {
    pause: function () { running = false; btn.style.transform = ''; },
    resume: function () { running = true; requestAnimationFrame(animate); }
  };

  function animate(time) {
    if (!running) return;

    var dx = Math.sin(time * speedX + phaseX) * ampX;
    var dy = Math.sin(time * speedY + phaseY) * ampY;
    var rot = rotBase + Math.sin(time * 0.0004 + phaseX) * 0.6;

    btn.style.transform =
      'translate(' + dx.toFixed(1) + 'px, ' + dy.toFixed(1) + 'px) rotate(' + rot.toFixed(2) + 'deg)';

    requestAnimationFrame(animate);
  }

  // Respect reduced motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return;
  }

  requestAnimationFrame(animate);
})();
