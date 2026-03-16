/* ========================================
   FLOATING-ICONS.JS — 3D depth icon field
   Icons float at different "depths" with
   blur, scale, parallax drift, and
   mouse-based parallax movement
   ======================================== */

(function () {
  'use strict';

  var container = document.getElementById('floatingIcons');
  if (!container) return;

  // Disable mouse parallax on the tools page
  var isToolsPage = !!document.querySelector('.tools-layout');

  // Icon definitions with position (% of viewport), depth layer, and rotation
  // depth: 0 = far back (small, blurry), 1 = mid, 2 = foreground (large, sharp)
  var icons = [
    // Top row — scattered across upper portion
    { src: 'icon-esc.png',       x: 9,   y: 8,   depth: 2, rot: -8,   size: 85  },
    { src: 'icon-graffiti.png',  x: 27,  y: 5,   depth: 1, rot: 5,    size: 120 },
    { src: 'icon-star.png',      x: 70,  y: 6,   depth: 1, rot: 12,   size: 90  },
    { src: 'icon-computer.png',  x: 88,  y: 8,   depth: 2, rot: -3,   size: 105 },
    // Mid row — flanking the character
    { src: 'icon-moneybag.png',  x: 15,  y: 30,  depth: 0, rot: -5,   size: 95  },
    { src: 'icon-cursor.png',    x: 30,  y: 35,  depth: 1, rot: 0,    size: 80  },
    { src: 'icon-chess.png',     x: 80,  y: 26,  depth: 0, rot: 3,    size: 100 },
    { src: 'icon-brain.png',     x: 92,  y: 34,  depth: 2, rot: -6,   size: 95  },
    // Bottom row — around and below the cards
    { src: 'icon-billiards.png', x: 4,   y: 52,  depth: 1, rot: 8,    size: 90  },
    { src: 'icon-film.png',      x: 20,  y: 56,  depth: 0, rot: -12,  size: 80  },
    { src: 'icon-camera.png',    x: 7,   y: 78,  depth: 2, rot: 4,    size: 110 },
    { src: 'icon-vinyl.png',     x: 78,  y: 66,  depth: 0, rot: -8,   size: 100 },
    { src: 'icon-books.png',     x: 92,  y: 80,  depth: 1, rot: 6,    size: 90  },
  ];

  // Depth config: scale multiplier, blur amount, opacity, z-index, drift speed
  // mouseAmp: how much mouse movement shifts the icon (far = more, close = less)
  var depthConfig = {
    0: { scale: 0.55, blur: 2.5, opacity: 0.5,  z: 0, driftAmp: 8,  driftSpeed: 0.0004, mouseAmp: 15  },
    1: { scale: 0.8,  blur: 0.5, opacity: 0.75, z: 1, driftAmp: 5,  driftSpeed: 0.0007, mouseAmp: 8   },
    2: { scale: 1.0,  blur: 0,   opacity: 0.9,  z: 3, driftAmp: 3,  driftSpeed: 0.001,  mouseAmp: 3   },
  };

  var isMobile = window.innerWidth <= 768;
  // On mobile, shrink icons by ~35% so they fit the smaller screen
  var mobileScale = isMobile ? 0.65 : 1;

  // Mouse tracking state (normalized -1 to 1 from center)
  var mouseX = 0;
  var mouseY = 0;
  var targetMouseX = 0;
  var targetMouseY = 0;

  var iconEls = [];

  // Create icon elements
  icons.forEach(function (icon, i) {
    var cfg = depthConfig[icon.depth];
    var el = document.createElement('div');
    el.className = 'floating-icon';

    var displaySize = Math.round(icon.size * cfg.scale * mobileScale);
    var adjustedY = icon.y;

    el.style.cssText = [
      'position: absolute',
      'left: ' + icon.x + '%',
      'top: ' + adjustedY + '%',
      'width: ' + displaySize + 'px',
      'height: ' + displaySize + 'px',
      'z-index: ' + cfg.z,
      'opacity: ' + cfg.opacity,
      'filter: blur(' + cfg.blur + 'px)',
      'transform: translate(-50%, -50%) rotate(' + icon.rot + 'deg)',
      'will-change: transform',
      'pointer-events: none',
      'user-select: none',
      '-webkit-user-select: none',
    ].join(';');

    var img = document.createElement('img');
    img.src = icon.src;
    img.alt = '';
    img.loading = 'lazy';
    img.draggable = false;
    img.style.cssText = 'width:100%;height:100%;object-fit:contain;';

    el.appendChild(img);
    container.appendChild(el);

    iconEls.push({
      el: el,
      icon: icon,
      cfg: cfg,
      baseRot: icon.rot,
      phaseX: Math.random() * Math.PI * 2,
      phaseY: Math.random() * Math.PI * 2,
    });
  });

  // Mouse tracking — only on non-tools pages and non-mobile
  if (!isToolsPage && !isMobile) {
    document.addEventListener('mousemove', function (e) {
      // Normalize mouse position to -1...1 from viewport center
      targetMouseX = (e.clientX / window.innerWidth - 0.5) * 2;
      targetMouseY = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  // Gentle sinusoidal drift animation + mouse parallax
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!prefersReduced) {
    function animate(time) {
      // Smooth lerp for mouse position (easing factor 0.06 for subtle, smooth feel)
      mouseX += (targetMouseX - mouseX) * 0.06;
      mouseY += (targetMouseY - mouseY) * 0.06;

      for (var i = 0; i < iconEls.length; i++) {
        var item = iconEls[i];
        var cfg = item.cfg;

        // Sinusoidal auto-drift
        var driftX = Math.sin(time * cfg.driftSpeed + item.phaseX) * cfg.driftAmp;
        var driftY = Math.sin(time * cfg.driftSpeed * 0.7 + item.phaseY) * cfg.driftAmp * 0.6;
        var driftRot = Math.sin(time * 0.0003 + item.phaseX) * 1.5;

        // Mouse parallax offset (only if not tools page)
        var parallaxX = 0;
        var parallaxY = 0;
        if (!isToolsPage && !isMobile) {
          parallaxX = mouseX * cfg.mouseAmp;
          parallaxY = mouseY * cfg.mouseAmp;
        }

        var totalX = driftX + parallaxX;
        var totalY = driftY + parallaxY;

        item.el.style.transform =
          'translate(calc(-50% + ' + totalX.toFixed(1) + 'px), calc(-50% + ' + totalY.toFixed(1) + 'px)) ' +
          'rotate(' + (item.baseRot + driftRot).toFixed(1) + 'deg)';
      }
      requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }
})();
