/* ========================================
   PIXEL-CANVAS — Dot Splatter Hover Effect
   Inspired by rmv.fyi's <pixel-canvas>
   Canvas-based particle system as Web Component
   ======================================== */

class PixelCanvas extends HTMLElement {
  static get observedAttributes() {
    return ['data-gap', 'data-speed', 'data-colors', 'data-no-focus'];
  }

  constructor() {
    super();

    // Shadow DOM for encapsulation
    this.attachShadow({ mode: 'open' });

    const canvas = document.createElement('canvas');
    const style = document.createElement('style');

    style.textContent = `
      :host {
        display: block;
        width: 100%;
        height: 100%;
        position: absolute;
        top: 0;
        left: 0;
        pointer-events: none;
      }
      canvas {
        display: block;
        width: 100%;
        height: 100%;
      }
    `;

    this.shadowRoot.append(style, canvas);
    this._canvas = canvas;
    this._ctx = canvas.getContext('2d');
    this._pixels = [];
    this._animId = null;
    this._isHovered = false;
    this._startTime = 0;
    this._bound = {};
  }

  connectedCallback() {
    this._gap = parseInt(this.dataset.gap) || 6;
    this._speed = parseInt(this.dataset.speed) || 80;
    this._colors = (this.dataset.colors || '#8a9a7e').split(',').map(c => c.trim());
    this._noFocus = this.hasAttribute('data-no-focus');

    // Find parent element to attach events
    this._parent = this.parentElement;
    if (!this._parent) return;

    this._bound.enter = () => this._activate();
    this._bound.leave = () => this._deactivate();
    this._bound.focusin = () => { if (!this._noFocus) this._activate(); };
    this._bound.focusout = () => { if (!this._noFocus) this._deactivate(); };

    this._parent.addEventListener('mouseenter', this._bound.enter);
    this._parent.addEventListener('mouseleave', this._bound.leave);
    this._parent.addEventListener('focusin', this._bound.focusin);
    this._parent.addEventListener('focusout', this._bound.focusout);

    // ResizeObserver to handle size changes
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(this._parent);

    this._resize();
  }

  disconnectedCallback() {
    if (this._parent) {
      this._parent.removeEventListener('mouseenter', this._bound.enter);
      this._parent.removeEventListener('mouseleave', this._bound.leave);
      this._parent.removeEventListener('focusin', this._bound.focusin);
      this._parent.removeEventListener('focusout', this._bound.focusout);
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
    }
    this._stopAnimation();
  }

  _resize() {
    const rect = this._parent.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    this._canvas.width = rect.width * dpr;
    this._canvas.height = rect.height * dpr;
    this._ctx.scale(dpr, dpr);

    this._width = rect.width;
    this._height = rect.height;

    this._buildGrid();
  }

  _buildGrid() {
    this._pixels = [];
    const gap = this._gap;
    const cols = Math.floor(this._width / gap);
    const rows = Math.floor(this._height / gap);
    const centerX = this._width / 2;
    const centerY = this._height / 2;
    const maxDist = Math.sqrt(centerX * centerX + centerY * centerY);

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = c * gap + gap / 2;
        const y = r * gap + gap / 2;
        const dx = x - centerX;
        const dy = y - centerY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        this._pixels.push({
          x,
          y,
          color: this._colors[Math.floor(Math.random() * this._colors.length)],
          delay: (dist / maxDist) * 600,  // radial delay in ms
          size: 0,
          targetSize: 0,
          minSize: gap * 0.08,
          maxSize: gap * 0.32,
          shimmerOffset: Math.random() * Math.PI * 2,
          shimmerSpeed: 1.5 + Math.random() * 2,
        });
      }
    }
  }

  _activate() {
    if (this._isHovered) return;
    this._isHovered = true;
    this._startTime = performance.now();

    // Set target sizes
    for (const p of this._pixels) {
      p.targetSize = p.maxSize;
    }

    this._startAnimation();
  }

  _deactivate() {
    this._isHovered = false;
    this._startTime = performance.now();

    // Reverse: target size to 0
    for (const p of this._pixels) {
      p.targetSize = 0;
    }
  }

  _startAnimation() {
    if (this._animId) return;
    this._lastFrame = performance.now();
    this._tick();
  }

  _stopAnimation() {
    if (this._animId) {
      cancelAnimationFrame(this._animId);
      this._animId = null;
    }
  }

  _tick() {
    this._animId = requestAnimationFrame((now) => {
      const elapsed = now - this._startTime;
      const dt = Math.min(now - this._lastFrame, 33); // cap at ~30fps delta
      this._lastFrame = now;

      const ctx = this._ctx;
      const dpr = window.devicePixelRatio || 1;

      // Clear
      ctx.clearRect(0, 0, this._width, this._height);

      let allDone = true;

      for (const p of this._pixels) {
        // Check if this pixel should be active yet (radial delay)
        if (this._isHovered && elapsed < p.delay) {
          allDone = false;
          continue;
        }

        // Interpolate size toward target
        const speed = 0.08;
        const diff = p.targetSize - p.size;

        if (Math.abs(diff) > 0.01) {
          p.size += diff * speed;
          allDone = false;
        } else {
          p.size = p.targetSize;
        }

        // Shimmer (breathing effect) when hovered
        let drawSize = p.size;
        if (this._isHovered && p.size > 0.1) {
          const shimmer = Math.sin(now * 0.001 * p.shimmerSpeed + p.shimmerOffset);
          drawSize = p.minSize + (p.maxSize - p.minSize) * (0.5 + shimmer * 0.5);
          allDone = false; // keep animating for shimmer
        }

        if (drawSize > 0.05) {
          ctx.beginPath();
          ctx.arc(p.x, p.y, drawSize, 0, Math.PI * 2);
          ctx.fillStyle = p.color;
          ctx.fill();
        }
      }

      // If everything is at rest and target is 0, stop
      if (allDone && !this._isHovered) {
        ctx.clearRect(0, 0, this._width, this._height);
        this._stopAnimation();
        this._animId = null;
        return;
      }

      this._tick();
    });
  }
}

customElements.define('pixel-canvas', PixelCanvas);
