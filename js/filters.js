// ── Filtres ───────────────────────────────────────────────────────

// Ouvre / ferme un dropdown de filtre
function toggleFilterDropdown(type) {
  const dd = document.getElementById(`filter-dd-${type}`);
  const isOpen = dd?.classList.contains('open');
  // ferme tous les autres
  ['group', 'tech'].forEach(t =>
    document.getElementById(`filter-dd-${t}`)?.classList.remove('open')
  );
  if (!isOpen) {
    renderFilterDropdown(type);
    dd?.classList.add('open');
  }
}

// Génère le contenu d'un dropdown
function renderFilterDropdown(type) {
  const dd = document.getElementById(`filter-dd-${type}`);
  if (!dd) return;
  let html = '';

  if (type === 'group') {
    if (!groups.length) {
      dd.innerHTML = '<div class="filter-dd-empty">Aucun groupe créé</div>';
      return;
    }
    groups.forEach(g => {
      const checked = activeFilters.groups.includes(g.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleFilter('groups','${g.id}')">
        ${esc(g.name)}
      </label>`;
    });

  } else {
    TECHS.forEach(t => {
      const checked = activeFilters.techs.includes(t.id);
      html += `<label class="filter-dd-item${checked ? ' checked' : ''}">
        <input type="checkbox" ${checked ? 'checked' : ''} onchange="toggleFilter('techs','${t.id}')">
        ${techIconHTML(t, 13)}
        ${esc(t.label)}
      </label>`;
    });
  }
  dd.innerHTML = html;
}

// Coche / décoche un filtre
function toggleFilter(key, value) {
  const arr = activeFilters[key];
  const idx = arr.indexOf(value);
  if (idx === -1) arr.push(value);
  else arr.splice(idx, 1);

  const type = key === 'groups' ? 'group' : 'tech';
  renderFilterDropdown(type);
  renderFilterChips();
  updateFilterBtnState();
  render();
}

// Retire un filtre depuis un chip
function removeFilter(key, value) {
  const arr = activeFilters[key];
  const idx = arr.indexOf(value);
  if (idx !== -1) arr.splice(idx, 1);
  renderFilterChips();
  updateFilterBtnState();
  render();
}

// Efface tous les filtres
function clearAllFilters() {
  activeFilters.groups = [];
  activeFilters.techs  = [];
  renderFilterChips();
  updateFilterBtnState();
  render();
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
