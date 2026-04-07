// ── Filtres ───────────────────────────────────────────────────────

// Retourne les sites qui passent la recherche + tous les filtres SAUF excludeKey
function getAvailableSites(excludeKey) {
  const q = (document.getElementById('search')?.value || '').trim().toLowerCase();
  return sites.filter(s => {
    if (q) {
      const g = groups.find(g => g.id === s.groupId);
      const match = (s.name   || '').toLowerCase().includes(q)
                 || (s.url    || '').toLowerCase().includes(q)
                 || (s.server || '').toLowerCase().includes(q)
                 || (s.notes  || '').toLowerCase().includes(q)
                 || (g ? g.name : '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (excludeKey !== 'groups' && activeFilters.groups.length && !activeFilters.groups.includes(s.groupId)) return false;
    if (excludeKey !== 'techs'  && activeFilters.techs.length  && !activeFilters.techs.some(t => (s.technologies || []).includes(t))) return false;
    return true;
  });
}

// Ouvre / ferme un dropdown de filtre
function toggleFilterDropdown(type) {
  const dd = document.getElementById(`filter-dd-${type}`);
  const isOpen = dd?.classList.contains('open');
  ['group', 'tech'].forEach(t =>
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

  if (type === 'group') {
    if (!groups.length) {
      dd.innerHTML = '<div class="filter-dd-empty">Aucun groupe créé</div>';
      return;
    }
    const available = getAvailableSites('groups');
    const availableGroupIds = new Set(available.map(s => s.groupId));

    groups.forEach(g => {
      const checked   = activeFilters.groups.includes(g.id);
      const hasResult = checked || availableGroupIds.has(g.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}${!hasResult ? ' disabled' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${!hasResult ? 'disabled' : ''} onchange="toggleFilter('groups','${g.id}')">
        ${esc(g.name)}
      </label>`;
    });

  } else {
    const available     = getAvailableSites('techs');
    const availableTechIds = new Set(available.flatMap(s => s.technologies || []));

    TECHS.forEach(t => {
      const checked   = activeFilters.techs.includes(t.id);
      const hasResult = checked || availableTechIds.has(t.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}${!hasResult ? ' disabled' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} ${!hasResult ? 'disabled' : ''} onchange="toggleFilter('techs','${t.id}')">
        ${techIconHTML(t, 13)}
        ${esc(t.label)}
      </label>`;
    });
  }
  dd.innerHTML = html;
}

// Re-render les dropdowns ouverts
function refreshOpenDropdowns() {
  ['group', 'tech'].forEach(type => {
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
  // re-render les deux dropdowns si ouverts (les dispo changent)
  ['group', 'tech'].forEach(type => {
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
  activeFilters.groups = [];
  activeFilters.techs  = [];
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

  activeFilters.groups.forEach(gid => {
    const g = groups.find(x => x.id === gid);
    if (!g) return;
    chips.push(`<span class="filter-chip">${esc(g.name)}<button onclick="removeFilter('groups','${gid}')" title="Retirer">&#10005;</button></span>`);
  });

  activeFilters.techs.forEach(tid => {
    const t = TECHS.find(x => x.id === tid);
    if (!t) return;
    chips.push(`<span class="filter-chip">${techIconHTML(t, 11)}${esc(t.label)}<button onclick="removeFilter('techs','${tid}')" title="Retirer">&#10005;</button></span>`);
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
  document.getElementById('filter-btn-group')?.classList.toggle('active', activeFilters.groups.length > 0);
  document.getElementById('filter-btn-tech')?.classList.toggle('active',  activeFilters.techs.length  > 0);
}

// Fermeture des dropdowns au clic extérieur
document.addEventListener('click', e => {
  ['group', 'tech'].forEach(type => {
    const wrap = document.getElementById(`filter-wrap-${type}`);
    if (wrap && !wrap.contains(e.target))
      document.getElementById(`filter-dd-${type}`)?.classList.remove('open');
  });
});
