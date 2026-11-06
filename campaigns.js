/* ========================================
   CAMPAIGNS.JS
   1. Deck: the active card sits in front with two cards on each side,
      faces parallel to the screen, stepping back in depth. A hidden
      card waits one slot further out on each side and fades + slides
      in when the deck moves. Drag/swipe, arrow keys, the nav arrows,
      or a click on a side card moves it. With fewer than 7 campaigns
      the deck repeats them so both sides stay full.
   2. Card: the active card tilts toward the pointer with a matte sheen,
      and flips between video (front) and numbers (back).
   3. Video: the active card loops its campaign video muted. "Watch with
      sound" opens the full player. Cards whose file isn't uploaded yet
      fall back to Instagram.
   4. KPI filter: options come from the stat labels (<dt>) on the cards,
      so new cards from /brand-recap show up with no extra config.
      ?kpi=new-arr deep-links a filter.
   Everything reads the card markup /brand-recap writes; nothing here
   is per-brand.
   ======================================== */

(function () {
  const deck = document.getElementById('campaignDeck');
  if (!deck) return;

  const allCards = Array.from(deck.querySelectorAll('.campaign-card'));
  if (!allCards.length) return;

  const SIDE = 2;                 // visible cards on each side of the front
  const MIN_SLOTS = SIDE * 2 + 3; // + front + one hidden waiting card per side

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  const nav = document.getElementById('deckNav');
  const prevBtn = document.getElementById('deckPrev');
  const nextBtn = document.getElementById('deckNext');
  const brandEl = document.getElementById('deckBrand');
  const countEl = document.getElementById('deckCount');

  let cards = allCards.slice();   // elements in the deck: matching cards + repeats
  let realCount = cards.length;   // matching campaigns (what the caption counts)
  let pos = 0;                    // float while dragging, whole number at rest
  let inView = true;

  const brandName = (card) => {
    const img = card.querySelector('.campaign-card__logo img');
    return img ? img.alt.replace(/\s*logo$/i, '') : card.dataset.brand;
  };

  /* ------------------------------
     Per-card motion state (tilt + flip), eased every frame
     ------------------------------ */
  const state = new Map();
  const track = (card) => {
    state.set(card, {
      inner: card.querySelector('.campaign-card__inner'),
      back: card.querySelector('.campaign-card__back'),
      rx: 0, ry: 0, flip: 0, sheen: 0, showBack: false,
      trx: 0, tRy: 0, tflip: 0, tsheen: 0,
      lastOffset: null,
    });
  };
  allCards.forEach(track);

  let rafId = 0;
  const tick = () => {
    rafId = 0;
    let moving = false;
    state.forEach((s) => {
      const k = reduceMotion.matches ? 1 : 0.14;
      s.rx += (s.trx - s.rx) * k;
      s.ry += (s.tRy - s.ry) * k;
      s.flip += (s.tflip - s.flip) * (reduceMotion.matches ? 1 : 0.11);
      s.sheen += (s.tsheen - s.sheen) * k;
      if (Math.abs(s.trx - s.rx) + Math.abs(s.tRy - s.ry) + Math.abs(s.tflip - s.flip) + Math.abs(s.tsheen - s.sheen) > 0.02) {
        moving = true;
      } else {
        s.rx = s.trx; s.ry = s.tRy; s.flip = s.tflip; s.sheen = s.tsheen;
      }
      // Turn to edge-on, swap faces, turn the rest of the way. The back
      // never sits at 180deg, so no browser can mirror its click targets.
      const showBack = s.flip > 90;
      const turn = showBack ? s.flip - 180 : s.flip;
      if (showBack !== s.showBack) {
        s.showBack = showBack;
        s.inner.classList.toggle('shows-back', showBack);
      }
      s.inner.style.transform = `rotateX(${s.rx.toFixed(2)}deg) rotateY(${(s.ry + turn).toFixed(2)}deg)`;
      s.inner.style.setProperty('--sheen', s.sheen.toFixed(3));
    });
    if (moving) rafId = requestAnimationFrame(tick);
  };
  const animate = () => { if (!rafId) rafId = requestAnimationFrame(tick); };

  /* ------------------------------
     Deck layout
     ------------------------------ */
  const wrap = (i, n) => ((i % n) + n) % n;
  const activeIndex = () => wrap(Math.round(pos), cards.length);
  const activeCard = () => cards[activeIndex()];

  function layout() {
    const n = cards.length;
    if (!n) return;
    const w = cards[0].offsetWidth || 280;
    const narrow = window.innerWidth < 640;
    const spread = narrow ? 0.62 : 1;

    cards.forEach((card, i) => {
      // Signed distance from the front, wrapped so the deck loops:
      // next cards to the right, previous cards to the left.
      let o = wrap(i - pos, n);
      if (o > n / 2) o -= n;
      const s = Math.sign(o);
      const a = Math.min(Math.abs(o), SIDE + 1);   // park the rest one slot past the edge

      // Faces stay parallel to the screen: no rotation, only depth.
      // Each step out sits further back (smaller) and further aside.
      const x = s * spread * w * (
        Math.min(a, 1) * 0.72 +
        Math.min(Math.max(a - 1, 0), 1) * 0.62 +
        Math.max(a - 2, 0) * 0.5
      );
      const z = -a * 230;
      // Visible cards stay solid; only the parked card fades (0 -> 1 as
      // it slides into the outer slot). Depth comes from the veil below.
      const fade = a <= SIDE ? 1 : Math.max(0, SIDE + 1 - a);

      // A parked card that wraps to the other side jumps while hidden
      // instead of sweeping across the deck.
      const st = state.get(card);
      const jumped = st.lastOffset !== null && Math.abs(o - st.lastOffset) > n / 2;
      st.lastOffset = o;
      if (jumped) card.classList.add('no-ease');

      card.style.transform = `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px)`;
      card.style.opacity = fade.toFixed(3);
      card.style.zIndex = String(100 - Math.round(a * 10));
      // Paper-colored veil: 40% on the first card out, 65% on the second,
      // so the back of the deck melts into the page behind the front card.
      // campaigns.css fades the outline and shadow by the same amount.
      const veil = Math.min(a, 1) * 0.4 + Math.min(Math.max(a - 1, 0), 1) * 0.25;
      card.style.setProperty('--veil', veil.toFixed(3));
      card.style.pointerEvents = fade < 0.5 ? 'none' : '';

      if (jumped) {
        card.offsetWidth; // commit the jump before easing comes back
        card.classList.remove('no-ease');
      }
    });
  }

  function settle() {
    const active = activeCard();
    cards.forEach((card, i) => {
      const isActive = card === active;
      card.classList.toggle('is-active', isActive);
      card.setAttribute('aria-roledescription', 'slide');
      card.setAttribute('aria-label', `${(i % realCount) + 1} of ${realCount}: ${brandName(card)}`);
      card.setAttribute('aria-hidden', isActive ? 'false' : 'true');
      const st = state.get(card);
      if (!isActive) {
        st.tflip = 0; st.trx = 0; st.tRy = 0; st.tsheen = 0;
        card.classList.remove('is-flipped');
      }
      updateFocusables(card);
    });
    animate();

    if (active) {
      brandEl.textContent = brandName(active);
      countEl.textContent = `${(activeIndex() % realCount) + 1} of ${realCount}`;
    }
    const single = realCount < 2;
    prevBtn.disabled = single;
    nextBtn.disabled = single;
    syncVideos();
  }

  function go(target) {
    pos = target;
    layout();
    settle();
  }

  const step = (dir) => { if (realCount > 1) go(Math.round(pos) + dir); };

  /* ------------------------------
     Flip
     Only the face showing on the active card is reachable by Tab.
     ------------------------------ */
  function updateFocusables(card) {
    const isActive = card === activeCard();
    const flipped = card.classList.contains('is-flipped');
    card.querySelectorAll('.campaign-card__front button, .campaign-card__front a').forEach((el) => {
      el.tabIndex = isActive && !flipped ? 0 : -1;
    });
    card.querySelectorAll('.campaign-card__back button, .campaign-card__back a, .campaign-card__back summary, .campaign-card__body').forEach((el) => {
      el.tabIndex = isActive && flipped ? 0 : -1;
    });
  }

  function setFlip(card, flipped) {
    const st = state.get(card);
    st.tflip = flipped ? 180 : 0;
    card.classList.toggle('is-flipped', flipped);
    updateFocusables(card);
    animate();
    syncVideos();

    // Keep focus on the face that's now showing
    const face = card.querySelector(flipped ? '.campaign-card__back' : '.campaign-card__front');
    const btn = face.querySelector('.campaign-card__btn--flip');
    if (btn && card.contains(document.activeElement)) btn.focus({ preventScroll: true });
  }

  /* ------------------------------
     Pointer tilt + sheen (active card, mouse only)
     ------------------------------ */
  deck.addEventListener('pointermove', (e) => {
    if (drag.active || !finePointer.matches || reduceMotion.matches) return;
    const card = activeCard();
    if (!card) return;
    const st = state.get(card);
    const r = card.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    const inside = px >= 0 && px <= 1 && py >= 0 && py <= 1;

    if (inside) {
      st.trx = (0.5 - py) * 12;
      st.tRy = (px - 0.5) * 16;
      st.tsheen = 1;
      st.inner.style.setProperty('--mx', `${(px * 100).toFixed(1)}%`);
      st.inner.style.setProperty('--my', `${(py * 100).toFixed(1)}%`);
    } else {
      st.trx = 0; st.tRy = 0; st.tsheen = 0;
    }
    animate();
  });

  deck.addEventListener('pointerleave', () => {
    const card = activeCard();
    if (!card) return;
    const st = state.get(card);
    st.trx = 0; st.tRy = 0; st.tsheen = 0;
    animate();
  });

  /* ------------------------------
     Drag / swipe
     A horizontal move past 8px becomes a drag; vertical moves are left
     to the page (touch-action: pan-y) so scrolling still works.
     ------------------------------ */
  const drag = { active: false, id: null, x: 0, y: 0, startPos: 0, lastX: 0, lastT: 0, v: 0 };
  let suppressClick = false;

  deck.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || realCount < 2) return;
    drag.id = e.pointerId;
    drag.x = drag.lastX = e.clientX;
    drag.y = e.clientY;
    drag.startPos = Math.round(pos);
    drag.lastT = performance.now();
    drag.v = 0;
  });

  deck.addEventListener('pointermove', (e) => {
    if (drag.id !== e.pointerId) return;
    const dx = e.clientX - drag.x;
    const dy = e.clientY - drag.y;

    if (!drag.active) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(dy)) return;
      drag.active = true;
      deck.classList.add('is-dragging');
      deck.setPointerCapture(e.pointerId);
      const st = state.get(activeCard());
      st.trx = 0; st.tRy = 0; st.tsheen = 0;
      animate();
    }

    const now = performance.now();
    drag.v = (e.clientX - drag.lastX) / Math.max(now - drag.lastT, 1);
    drag.lastX = e.clientX;
    drag.lastT = now;

    const w = cards[0].offsetWidth * 0.72;
    pos = drag.startPos - dx / w;
    layout();
  });

  const endDrag = (e) => {
    if (drag.id !== e.pointerId) return;
    drag.id = null;
    if (!drag.active) return;
    drag.active = false;
    deck.classList.remove('is-dragging');
    suppressClick = true;
    setTimeout(() => { suppressClick = false; }, 0);

    // A flick counts even if it's short
    let target = Math.round(pos - drag.v * 0.25);
    const dx = e.clientX - drag.x;
    if (target === drag.startPos && Math.abs(dx) > 40) target += dx < 0 ? 1 : -1;
    go(target);
  };
  deck.addEventListener('pointerup', endDrag);
  deck.addEventListener('pointercancel', endDrag);

  /* ------------------------------
     Clicks: side card -> bring forward; buttons on the active card
     ------------------------------ */
  deck.addEventListener('click', (e) => {
    if (suppressClick) { e.preventDefault(); e.stopPropagation(); return; }
    const card = e.target.closest('.campaign-card');
    if (!card) return;

    if (card !== activeCard()) {
      e.preventDefault();
      const i = cards.indexOf(card);
      let o = wrap(i - Math.round(pos), cards.length);
      if (o > cards.length / 2) o -= cards.length;
      go(Math.round(pos) + o);
      return;
    }

    if (e.target.closest('.campaign-card__btn--flip')) {
      setFlip(card, !card.classList.contains('is-flipped'));
    } else if (e.target.closest('.campaign-card__btn--play') || e.target.closest('.campaign-card__media')) {
      openPlayer(card);
    }
  }, true);

  deck.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); }
  });

  prevBtn.addEventListener('click', () => step(-1));
  nextBtn.addEventListener('click', () => step(1));

  /* ------------------------------
     Video
     Each card's file is checked once. Cloudflare Pages answers a missing
     file with the HTML homepage, so the content-type is what tells us.
     ------------------------------ */
  const media = new Map(); // card -> { video, ok }

  function emptyMedia(card) {
    const box = card.querySelector('.campaign-card__media');
    const logo = card.querySelector('.campaign-card__logo img');
    box.innerHTML = '';
    const empty = document.createElement('div');
    empty.className = 'campaign-card__media-empty';
    if (logo) {
      const img = document.createElement('img');
      img.src = logo.getAttribute('src');
      img.alt = '';
      empty.appendChild(img);
    }
    const p = document.createElement('p');
    p.textContent = 'The video lives on Instagram for now';
    empty.appendChild(p);
    box.appendChild(empty);

    const play = card.querySelector('.campaign-card__btn--play');
    if (play) play.textContent = 'Watch on IG';
    media.set(card, { video: null, ok: false });
  }

  const probes = new Map();
  const probe = (url) => {
    if (!probes.has(url)) probes.set(url, probeOnce(url));
    return probes.get(url);
  };

  async function probeOnce(url) {
    // Videos on another host (an R2 bucket, say) skip the check: a
    // cross-origin HEAD needs CORS, and the <video> error event below
    // catches a missing file anyway.
    if (new URL(url, window.location.href).origin !== window.location.origin) return true;
    try {
      const res = await fetch(url, { method: 'HEAD' });
      return res.ok && (res.headers.get('content-type') || '').startsWith('video/');
    } catch (_) {
      return false;
    }
  }

  async function setupMedia(card) {
    const src = card.dataset.video;
    if (!src || !(await probe(src))) { emptyMedia(card); return; }

    const box = card.querySelector('.campaign-card__media');
    const video = document.createElement('video');
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    // Metadata only (a few KB) so the card knows the video's shape up
    // front; the frames load when the card reaches the front.
    video.preload = 'metadata';
    video.setAttribute('aria-hidden', 'true');
    if (card.dataset.poster) video.poster = card.dataset.poster;
    video.addEventListener('error', () => emptyMedia(card), { once: true });
    video.addEventListener('loadedmetadata', () => shapeCard(card, video.videoWidth, video.videoHeight), { once: true });
    video.src = src;
    box.appendChild(video);
    media.set(card, { video, ok: true });
    syncVideos();
  }

  /* Shape: landscape videos fill the card. Vertical videos run as a
     column on the left with the label (logo, descriptor, one headline
     number, buttons) beside them. Read from the file, no config. */
  const HERO_KPIS = ['new-arr', 'revenue', 'trial-signups', 'signups', 'conversions', 'views', 'reach'];
  const kpiSlug = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  function shapeCard(card, w, h) {
    if (!w || !h) return;
    card.dataset.vw = w;
    card.dataset.vh = h;
    const portrait = h > w;
    card.classList.toggle('is-portrait', portrait);
    if (!portrait || card.querySelector('.campaign-card__aside')) return;

    const aside = document.createElement('div');
    aside.className = 'campaign-card__aside';

    const desc = card.querySelector('.campaign-card__back .campaign-card__descriptor');
    if (desc) {
      const p = document.createElement('p');
      p.className = 'campaign-card__aside-desc';
      p.textContent = desc.textContent;
      aside.appendChild(p);
    }

    const stats = Array.from(card.querySelectorAll('.campaign-card__stat'));
    const rank = (st) => {
      const i = HERO_KPIS.indexOf(kpiSlug(st.querySelector('dt').textContent));
      return i === -1 ? HERO_KPIS.length : i;
    };
    const hero = stats.sort((a, b) => rank(a) - rank(b))[0];
    if (hero) {
      const p = document.createElement('p');
      p.className = 'campaign-card__hero-stat';
      const strong = document.createElement('strong');
      strong.textContent = hero.querySelector('dd').textContent;
      const span = document.createElement('span');
      span.textContent = hero.querySelector('dt').textContent;
      p.append(strong, span);
      aside.appendChild(p);
    }

    card.querySelector('.campaign-card__front .campaign-card__foot').before(aside);
  }

  const player = document.getElementById('campaignPlayer');
  const playerVideo = document.getElementById('campaignPlayerVideo');

  function syncVideos() {
    const active = activeCard();
    const playerOpen = player && player.open;
    media.forEach(({ video, ok }, card) => {
      if (!ok || !video) return;
      const shouldPlay = card === active && inView && !playerOpen && !document.hidden &&
        !card.classList.contains('is-flipped') && !reduceMotion.matches && !card.hidden;
      if (shouldPlay) {
        video.play().catch(() => {});
      } else if (!video.paused) {
        video.pause();
      }
    });
  }

  if ('IntersectionObserver' in window) {
    new IntersectionObserver((entries) => {
      inView = entries[0].isIntersecting;
      syncVideos();
    }, { threshold: 0.25 }).observe(deck);
  }
  document.addEventListener('visibilitychange', syncVideos);

  /* ------------------------------
     Player
     ------------------------------ */
  function openPlayer(card) {
    const m = media.get(card);
    const ig = card.dataset.instagram;
    if (!m || !m.ok || !player || typeof player.showModal !== 'function') {
      if (ig) window.open(ig, '_blank', 'noopener');
      return;
    }
    // Size the player to the video's own shape
    const vw = +card.dataset.vw || 9;
    const vh = +card.dataset.vh || 16;
    playerVideo.style.aspectRatio = `${vw} / ${vh}`;
    player.classList.toggle('is-portrait', vh > vw);
    playerVideo.src = card.dataset.video;
    if (card.dataset.poster) playerVideo.poster = card.dataset.poster;
    const igLink = document.getElementById('campaignPlayerIg');
    igLink.href = ig || '#';
    igLink.hidden = !ig;
    player.setAttribute('aria-label', `${brandName(card)} campaign video`);
    player.showModal();
    syncVideos();
    playerVideo.play().catch(() => {});
  }

  if (player) {
    document.getElementById('campaignPlayerClose').addEventListener('click', () => player.close());
    // Click on the dimmed backdrop closes it
    player.addEventListener('click', (e) => { if (e.target === player) player.close(); });
    player.addEventListener('close', () => {
      playerVideo.pause();
      playerVideo.removeAttribute('src');
      playerVideo.load();
      syncVideos();
    });
  }

  /* ------------------------------
     Repeats
     Fill the deck to MIN_SLOTS by repeating the matching campaigns in
     order, so both sides always hold two cards plus one waiting.
     Repeats are runtime-only copies; the page source keeps one card
     per campaign for /brand-recap.
     ------------------------------ */
  function buildDeck(matching) {
    deck.querySelectorAll('.campaign-card.is-repeat').forEach((c) => {
      const m = media.get(c);
      if (m && m.video) m.video.pause();
      media.delete(c);
      state.delete(c);
      c.remove();
    });

    realCount = matching.length;
    cards = matching.slice();
    if (realCount < 2) return;

    while (cards.length < MIN_SLOTS) {
      matching.forEach((orig) => {
        const copy = orig.cloneNode(true);
        copy.classList.add('is-repeat');
        copy.classList.remove('is-active', 'is-flipped');
        copy.querySelector('.campaign-card__media').innerHTML = '';
        const play = copy.querySelector('.campaign-card__btn--play');
        if (play) play.textContent = 'Watch with sound';
        copy.querySelectorAll('details[open]').forEach((d) => d.removeAttribute('open'));
        deck.appendChild(copy);
        track(copy);
        cards.push(copy);
        setupMedia(copy);
      });
    }
  }

  /* ------------------------------
     KPI filter
     ------------------------------ */
  function setupFilter() {
    const filter = document.getElementById('kpiFilter');
    const select = document.getElementById('kpiSelect');
    if (!filter || !select) return false;

    const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

    // Each KPI, how many campaigns report it, and first-seen order
    const kpis = new Map();
    allCards.forEach((card) => {
      card.querySelectorAll('.campaign-card__stat dt').forEach((dt) => {
        const label = dt.textContent.trim();
        const slug = slugify(label);
        dt.parentElement.dataset.kpi = slug;
        if (!kpis.has(slug)) kpis.set(slug, { label, count: 0, order: kpis.size });
        kpis.get(slug).count++;
      });
    });

    // A filter with one option filters nothing
    if (kpis.size < 2) return false;

    // Most-reported first, ties keep page order
    const sorted = Array.from(kpis.entries()).sort((a, b) => b[1].count - a[1].count || a[1].order - b[1].order);

    select.appendChild(new Option(`All KPIs (${allCards.length})`, ''));
    sorted.forEach(([slug, { label, count }]) => select.appendChild(new Option(`${label} (${count})`, slug)));

    const apply = (slug, initial) => {
      if (slug && !kpis.has(slug)) slug = '';
      select.value = slug;
      filter.classList.toggle('is-active', !!slug);

      allCards.forEach((card) => {
        const match = !slug || card.querySelector(`.campaign-card__stat[data-kpi="${slug}"]`);
        card.hidden = !match;
        card.querySelectorAll('.campaign-card__stat').forEach((stat) => {
          stat.classList.toggle('is-highlighted', !!slug && stat.dataset.kpi === slug);
        });
      });

      // Rebuild the deck from the matching cards, first one in front.
      // With a KPI picked, cards open on their numbers.
      buildDeck(allCards.filter((c) => !c.hidden));
      cards.forEach((c) => { state.get(c).lastOffset = null; });
      pos = 0;
      layout();
      settle();
      if (slug && !initial && cards[0]) setFlip(cards[0], true);

      const url = new URL(window.location.href);
      if (slug) url.searchParams.set('kpi', slug);
      else url.searchParams.delete('kpi');
      history.replaceState(null, '', url);
    };

    select.addEventListener('change', () => apply(select.value, false));

    filter.hidden = false;
    apply(new URLSearchParams(window.location.search).get('kpi') || '', true);
    return true;
  }

  /* ------------------------------
     Init
     ------------------------------ */
  deck.classList.add('is-ready');
  nav.hidden = false;

  // First paint without easing so the deck doesn't fly in from the center
  allCards.forEach((c) => c.classList.add('no-ease'));
  allCards.forEach(setupMedia);

  // The filter builds the deck (repeats included). If there's no
  // filter to build, build it here.
  if (!setupFilter()) buildDeck(allCards.slice());

  layout();
  settle();
  requestAnimationFrame(() => requestAnimationFrame(() => {
    deck.querySelectorAll('.campaign-card.no-ease').forEach((c) => c.classList.remove('no-ease'));
  }));

  // Scrollbar width, so the full-bleed deck stops exactly at the page edge
  const measureScrollbar = () => {
    const sbw = window.innerWidth - document.documentElement.clientWidth;
    document.documentElement.style.setProperty('--sbw', `${Math.max(0, sbw)}px`);
  };
  measureScrollbar();

  let resizeId = 0;
  window.addEventListener('resize', () => {
    cancelAnimationFrame(resizeId);
    resizeId = requestAnimationFrame(() => { measureScrollbar(); layout(); });
  });
})();
