/* ========================================
   CAMPAIGNS.JS — KPI filter
   Builds the dropdown options from the stat labels (<dt>) already on
   the cards, so new cards from /brand-recap show up with no extra config.
   Choosing a KPI hides cards that don't report it and highlights the
   matching stat on the cards that do. ?kpi=new-arr deep-links a filter.
   Native <select> so phones get their own picker.
   ======================================== */

(function () {
  const filter = document.getElementById('kpiFilter');
  const select = document.getElementById('kpiSelect');
  const cards = Array.from(document.querySelectorAll('.campaign-card'));
  if (!filter || !select || !cards.length) return;

  const slugify = (s) => s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // Collect each KPI, how many campaigns report it, and first-seen order
  const kpis = new Map();
  cards.forEach((card) => {
    card.querySelectorAll('.campaign-card__stat dt').forEach((dt) => {
      const label = dt.textContent.trim();
      const slug = slugify(label);
      dt.parentElement.dataset.kpi = slug;
      if (!kpis.has(slug)) kpis.set(slug, { label, count: 0, order: kpis.size });
      kpis.get(slug).count++;
    });
  });

  // A filter with one option filters nothing
  if (kpis.size < 2) return;

  // Most-reported first, ties keep page order
  const sorted = Array.from(kpis.entries()).sort((a, b) => b[1].count - a[1].count || a[1].order - b[1].order);

  select.appendChild(new Option(`All KPIs (${cards.length})`, ''));
  sorted.forEach(([slug, { label, count }]) => select.appendChild(new Option(`${label} (${count})`, slug)));

  const apply = (slug) => {
    if (slug && !kpis.has(slug)) slug = '';
    select.value = slug;
    filter.classList.toggle('is-active', !!slug);

    cards.forEach((card) => {
      const match = !slug || card.querySelector(`.campaign-card__stat[data-kpi="${slug}"]`);
      card.hidden = !match;
      card.querySelectorAll('.campaign-card__stat').forEach((stat) => {
        stat.classList.toggle('is-highlighted', !!slug && stat.dataset.kpi === slug);
      });
    });

    const url = new URL(window.location.href);
    if (slug) url.searchParams.set('kpi', slug);
    else url.searchParams.delete('kpi');
    history.replaceState(null, '', url);
  };

  select.addEventListener('change', () => apply(select.value));

  filter.hidden = false;
  apply(new URLSearchParams(window.location.search).get('kpi') || '');
})();
