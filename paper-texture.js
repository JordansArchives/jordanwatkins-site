/* ========================================
   PAPER-TEXTURE.JS — Animated Paper Background
   Subtle dot-grid paper with gentle organic drift
   ======================================== */

(function () {
  'use strict';

  const canvas = document.getElementById('paperTexture');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width, height, dpr;
  let animId;

  // Paper parameters
  const DOT_SPACING = 18;      // spacing between dots (graph paper feel)
  const DOT_RADIUS = 0.6;      // base dot size
  const LINE_OPACITY = 0.06;   // faint grid line opacity
  const DOT_OPACITY = 0.18;    // dot opacity
  const DRIFT_SPEED = 0.0003;  // how fast the texture drifts
  const WRINKLE_COUNT = 6;     // number of "wrinkle" lines
  const GRAIN_DENSITY = 12000; // number of grain particles

  // Precompute grain positions for performance
  let grainPositions = [];
  let wrinkles = [];

  function resize() {
    dpr = window.devicePixelRatio || 1;
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    generateGrain();
    generateWrinkles();
  }

  function generateGrain() {
    grainPositions = [];
    for (let i = 0; i < GRAIN_DENSITY; i++) {
      grainPositions.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: 0.3 + Math.random() * 0.7,
        opacity: 0.02 + Math.random() * 0.05,
      });
    }
  }

  function generateWrinkles() {
    wrinkles = [];
    for (let i = 0; i < WRINKLE_COUNT; i++) {
      const isHorizontal = Math.random() > 0.5;
      wrinkles.push({
        x1: isHorizontal ? 0 : Math.random() * width,
        y1: isHorizontal ? Math.random() * height : 0,
        x2: isHorizontal ? width : Math.random() * width,
        y2: isHorizontal ? Math.random() * height : height,
        amplitude: 20 + Math.random() * 40,
        frequency: 0.003 + Math.random() * 0.005,
        phase: Math.random() * Math.PI * 2,
        opacity: 0.02 + Math.random() * 0.03,
      });
    }
  }

  function draw(time) {
    ctx.clearRect(0, 0, width, height);

    // Base paper color (slightly warm)
    ctx.fillStyle = '#f1e9e7';
    ctx.fillRect(0, 0, width, height);

    const drift = time * DRIFT_SPEED;

    // Draw subtle grid lines (graph paper)
    drawGridLines(drift);

    // Draw dot grid (notebook dots)
    drawDotGrid(drift);

    // Draw paper wrinkle shadows
    drawWrinkles(time);

    // Draw grain texture
    drawGrain();

    animId = requestAnimationFrame(draw);
  }

  function drawGridLines(drift) {
    ctx.strokeStyle = 'rgba(26, 45, 20, ' + LINE_OPACITY + ')';
    ctx.lineWidth = 0.5;

    const spacing = DOT_SPACING * 3; // larger grid squares
    const offsetX = (drift * 8) % spacing;
    const offsetY = (drift * 5) % spacing;

    // Vertical lines
    ctx.beginPath();
    for (let x = -spacing + offsetX; x < width + spacing; x += spacing) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    ctx.stroke();

    // Horizontal lines
    ctx.beginPath();
    for (let y = -spacing + offsetY; y < height + spacing; y += spacing) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
  }

  function drawDotGrid(drift) {
    const offsetX = (drift * 12) % DOT_SPACING;
    const offsetY = (drift * 8) % DOT_SPACING;

    ctx.fillStyle = 'rgba(26, 45, 20, ' + DOT_OPACITY + ')';

    for (let y = -DOT_SPACING + offsetY; y < height + DOT_SPACING; y += DOT_SPACING) {
      for (let x = -DOT_SPACING + offsetX; x < width + DOT_SPACING; x += DOT_SPACING) {
        // Slight organic wobble
        const wobbleX = Math.sin(y * 0.01 + drift * 3) * 0.5;
        const wobbleY = Math.cos(x * 0.01 + drift * 2) * 0.5;

        ctx.beginPath();
        ctx.arc(x + wobbleX, y + wobbleY, DOT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  function drawWrinkles(time) {
    for (const w of wrinkles) {
      ctx.save();
      ctx.strokeStyle = 'rgba(26, 45, 20, ' + w.opacity + ')';
      ctx.lineWidth = 0.8;
      ctx.beginPath();

      const steps = 60;
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const x = w.x1 + (w.x2 - w.x1) * t;
        const y = w.y1 + (w.y2 - w.y1) * t;
        const wave = Math.sin(t * Math.PI * 2 * w.frequency * 200 + w.phase + time * 0.0001) * w.amplitude * 0.3;

        if (i === 0) {
          ctx.moveTo(x + wave * 0.3, y + wave);
        } else {
          ctx.lineTo(x + wave * 0.3, y + wave);
        }
      }
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawGrain() {
    for (const g of grainPositions) {
      ctx.fillStyle = 'rgba(26, 45, 20, ' + g.opacity + ')';
      ctx.fillRect(g.x, g.y, g.size, g.size);
    }
  }

  // Reduce motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function init() {
    resize();
    if (prefersReducedMotion) {
      // Draw once, no animation
      draw(0);
      cancelAnimationFrame(animId);
    } else {
      draw(0);
    }
  }

  window.addEventListener('resize', function () {
    cancelAnimationFrame(animId);
    resize();
    if (!prefersReducedMotion) {
      draw(performance.now());
    }
  });

  init();
})();
