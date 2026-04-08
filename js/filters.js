// ── Filtres ───────────────────────────────────────────────────────

// Retourne les sites qui passent la recherche + tous les filtres SAUF excludeKey
function getAvailableSites(excludeKey) {
  const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
  return sites.filter(s => {
    if (q) {
      const g = groups.find(g => g.id === s.groupId);
      const match = (s.name        || '').toLowerCase().includes(q)
                 || (s.url         || '').toLowerCase().includes(q)
                 || (s.php_version || '').toLowerCase().includes(q)
                 || (s.agency      || '').toLowerCase().includes(q)
                 || (s.notes       || '').toLowerCase().includes(q)
                 || (g ? g.name    : '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (excludeKey !== 'servers'  && activeFilters.servers.length  && !activeFilters.servers.includes(s.groupId)) return false;
    if (excludeKey !== 'techs'    && activeFilters.techs.length    && !activeFilters.techs.some(t => (s.technologies || []).includes(t))) return false;
    if (excludeKey !== 'agencies' && activeFilters.agencies.length && !activeFilters.agencies.includes(s.agency)) return false;
    return true;
  });
}

// Ouvre / ferme un dropdown de filtre
function toggleFilterDropdown(type) {
  const dd = document.getElementById(`filter-dd-${type}`);
  const isOpen = dd?.classList.contains('open');
  ['server', 'tech', 'agency'].forEach(t =>
    document.getElementById(`filter-dd-${t}`)?.classList.remove('open')
  );
  if (!isOpen) {
    renderFilterDropdown(type);
    dd?.classList.add('open');
  }
}

// Génère le contenu d'un dropdown en grisant les options sans résultat
function renderFilterDropdown(type) {
  const dd = document.getElementById(`filter-dd-${type}`);
  if (!dd) return;
  let html = '';

  if (type === 'server') {
    if (!groups.length) { dd.innerHTML = '<div class="filter-dd-empty">Aucun serveur créé</div>'; return; }
    const available = getAvailableSites('servers');
    const availableIds = new Set(available.map(s => s.groupId));
    [...groups].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })).forEach(g => {
      const checked   = activeFilters.servers.includes(g.id);
      const hasResult = checked || availableIds.has(g.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}${!hasResult ? ' disabled' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${!hasResult ? 'disabled' : ''} onchange="toggleFilter('servers','${g.id}')">
        ${esc(g.name)}
      </label>`;
    });

  } else if (type === 'tech') {
    const available   = getAvailableSites('techs');
    const availableIds = new Set(available.flatMap(s => s.technologies || []));
    [...TECHS].sort((a, b) => a.label.localeCompare(b.label, 'fr', { numeric: true })).forEach(t => {
      const checked   = activeFilters.techs.includes(t.id);
      const hasResult = checked || availableIds.has(t.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}${!hasResult ? ' disabled' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${!hasResult ? 'disabled' : ''} onchange="toggleFilter('techs','${t.id}')">
        ${techIconHTML(t, 13)}
        ${esc(t.label)}
      </label>`;
    });

  } else if (type === 'agency') {
    const available    = getAvailableSites('agencies');
    const availableAgs = new Set(available.map(s => s.agency).filter(Boolean));
    [...AGENCIES].sort((a, b) => a.localeCompare(b, 'fr', { numeric: true })).forEach(ag => {
      const checked   = activeFilters.agencies.includes(ag);
      const hasResult = checked || availableAgs.has(ag);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}${!hasResult ? ' disabled' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${!hasResult ? 'disabled' : ''} onchange="toggleFilter('agencies','${esc(ag)}')">
        ${esc(ag)}
      </label>`;
    });
    if (!html) html = '<div class="filter-dd-empty">Aucune agence configurée</div>';
  }

  dd.innerHTML = html;
}

// Re-render les dropdowns ouverts
function refreshOpenDropdowns() {
  ['server', 'tech', 'agency'].forEach(type => {
    const dd = document.getElementById(`filter-dd-${type}`);
    if (dd?.classList.contains('open')) renderFilterDropdown(type);
  });
}

// Coche / décoche un filtre
function toggleFilter(key, value) {
  const arr = activeFilters[key];
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);

  render();
  ['server', 'tech', 'agency'].forEach(type => {
    const dd = document.getElementById(`filter-dd-${type}`);
    if (dd?.classList.contains('open')) renderFilterDropdown(type);
  });
  renderFilterChips();
  updateFilterBtnState();
}

// Retire un filtre depuis un chip
function removeFilter(key, value) {
  const arr = activeFilters[key];
  const idx = arr.indexOf(value);
  if (idx !== -1) arr.splice(idx, 1);
  render();
  refreshOpenDropdowns();
  renderFilterChips();
  updateFilterBtnState();
}

// Efface tous les filtres
function clearAllFilters() {
  activeFilters.servers  = [];
  activeFilters.techs    = [];
  activeFilters.agencies = [];
  render();
  refreshOpenDropdowns();
  renderFilterChips();
  updateFilterBtnState();
}

// Met à jour les chips actifs sous la barre
function renderFilterChips() {
  const container = document.getElementById('filter-chips');
  if (!container) return;
  const chips = [];

  activeFilters.servers.forEach(gid => {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    chips.push(`<span class="filter-chip">${esc(g.name)}<button onclick="removeFilter('servers','${gid}')" title="Retirer">&#10005;</button></span>`);
  });

  activeFilters.techs.forEach(tid => {
    const t = TECHS.find(x => x.id === tid);
    if (!t) return;
    chips.push(`<span class="filter-chip">${techIconHTML(t, 11)}${esc(t.label)}<button onclick="removeFilter('techs','${tid}')" title="Retirer">&#10005;</button></span>`);
  });

  activeFilters.agencies.forEach(ag => {
    chips.push(`<span class="filter-chip">${esc(ag)}<button onclick="removeFilter('agencies','${esc(ag)}')" title="Retirer">&#10005;</button></span>`);
  });

  if (chips.length) {
    container.innerHTML = chips.join('') +
      `<button class="filter-clear-all" onclick="clearAllFilters()">Tout effacer</button>`;
    container.style.display = 'flex';
  } else {
    container.innerHTML    = '';
    container.style.display = 'none';
  }
}

// Met en surbrillance les boutons de filtre quand actifs
function updateFilterBtnState() {
  document.getElementById('filter-btn-server')?.classList.toggle('active',  activeFilters.servers.length  > 0);
  document.getElementById('filter-btn-tech')?.classList.toggle('active',    activeFilters.techs.length    > 0);
  document.getElementById('filter-btn-agency')?.classList.toggle('active',  activeFilters.agencies.length > 0);
}

// Fermeture des dropdowns au clic extérieur
document.addEventListener('click', e => {
  ['server', 'tech', 'agency'].forEach(type => {
    const wrap = document.getElementById(`filter-wrap-${type}`);
    if (wrap && !wrap.contains(e.target))
      document.getElementById(`filter-dd-${type}`)?.classList.remove('open');
  });
});
