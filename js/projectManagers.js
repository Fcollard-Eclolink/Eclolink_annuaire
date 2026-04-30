// ── Cheffes de projet : CRUD + modale ─────────────────────────────

function pmDisplayName(pm) {
  if (!pm) return '';
  const fn = (pm.first_name || '').trim();
  const ln = (pm.last_name  || '').trim();
  return [fn, ln].filter(Boolean).join(' ');
}

// Tri stable par prénom puis nom
function pmSort(a, b) {
  const fa = a.first_name || '';
  const fb = b.first_name || '';
  const cmp = fa.localeCompare(fb, 'fr');
  return cmp !== 0 ? cmp : (a.last_name || '').localeCompare(b.last_name || '', 'fr');
}

// Options HTML d'agence pour <select>
function pmAgencyOptionsHtml(selected) {
  let html = `<option value="">— Agence —</option>`;
  [...AGENCIES].sort((a, b) => a.localeCompare(b, 'fr')).forEach(a => {
    html += `<option value="${esc(a)}" ${selected === a ? 'selected' : ''}>${esc(a)}</option>`;
  });
  return html;
}

// ── Ouverture / fermeture ─────────────────────────────────────────
function openPmModal() {
  renderPmList();
  openOverlay('pm-wrap');
}

function closePmModal() {
  document.getElementById('pm-wrap').classList.remove('open');
  if (!document.getElementById('modal-wrap').classList.contains('open')
   && !document.getElementById('confirm-wrap').classList.contains('open'))
    document.body.classList.remove('modal-open');
}

// ── Helpers de rendu interne ──────────────────────────────────────
function renderPmAssignedSection(pmId) {
  const assigned = sites.filter(s => s.project_manager_id === pmId);
  if (!assigned.length) return '';
  const chips = [...assigned]
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
    .map(s => `<button type="button" class="pm-chip"
      data-site-id="${esc(s.id)}" data-name="${esc(s.name.toLowerCase())}"
      onclick="togglePmSite('${esc(pmId)}','${esc(s.id)}', false)"
      title="Retirer ${esc(s.name)}">
      ${esc(s.name)} <span class="pm-chip-x">&times;</span>
    </button>`).join('');
  return `
    <div class="pm-assigned">
      <div class="pm-assigned-header">Sites attribués (${assigned.length})</div>
      <div class="pm-assigned-chips">${chips}</div>
    </div>`;
}

function renderPmFullList(pmId) {
  const sortedSites = [...sites].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  if (!sortedSites.length) return `<div class="pm-empty-sub">Aucun site enregistré.</div>`;
  return sortedSites.map(s => {
    const checked = s.project_manager_id === pmId ? 'checked' : '';
    return `<label class="pm-site-item" data-name="${esc(s.name.toLowerCase())}">
      <input type="checkbox" ${checked}
             data-pm-id="${esc(pmId)}" data-site-id="${esc(s.id)}"
             onchange="togglePmSite('${esc(pmId)}','${esc(s.id)}',this.checked)">
      <span>${esc(s.name)}</span>
    </label>`;
  }).join('');
}

function renderPmSitesBody(pmId) {
  return `
    <div class="pm-sites-body">
      <div class="pm-search">
        <input type="text" placeholder="Rechercher un site…"
               data-pm-id="${esc(pmId)}"
               oninput="filterPmSites(this, '${esc(pmId)}')">
      </div>
      <div class="pm-assigned-section">
        ${renderPmAssignedSection(pmId)}
      </div>
      <div class="pm-sites-section-label">Tous les sites</div>
      <div class="pm-sites-list">
        ${renderPmFullList(pmId)}
      </div>
    </div>`;
}

// ── Rendu de la liste des cheffes ─────────────────────────────────
function renderPmList() {
  const list = document.getElementById('pm-list');
  if (!list) return;

  // Capture l'état (open + valeur de search) pour le re-render
  const openIds = [...list.querySelectorAll('.pm-sites[open]')]
    .map(d => d.dataset.pmId).filter(Boolean);
  const searchValues = {};
  list.querySelectorAll('.pm-search input').forEach(input => {
    if (input.dataset.pmId) searchValues[input.dataset.pmId] = input.value;
  });

  if (!projectManagers.length) {
    list.innerHTML = `<div class="pm-empty">Aucune cheffe de projet enregistrée.</div>`;
    return;
  }

  list.innerHTML = [...projectManagers].sort(pmSort).map(pm => {
    const assignedCount = sites.filter(s => s.project_manager_id === pm.id).length;
    return `
      <div class="pm-row" data-pm-id="${esc(pm.id)}">
        <div class="pm-row-main">
          <input class="pm-input pm-name" data-field="first_name"
                 value="${esc(pm.first_name)}" placeholder="Prénom"
                 onblur="onPmBlur(this)">
          <input class="pm-input pm-name" data-field="last_name"
                 value="${esc(pm.last_name)}" placeholder="Nom"
                 onblur="onPmBlur(this)">
          <select class="pm-input pm-agency"
                  onchange="onPmAgencyChange('${esc(pm.id)}', this.value)">
            ${pmAgencyOptionsHtml(pm.agency)}
          </select>
          <button class="icon-btn del" onclick="deletePm('${esc(pm.id)}')" title="Supprimer">&#10005;</button>
        </div>
        <details class="pm-sites" data-pm-id="${esc(pm.id)}" id="pm-sites-${esc(pm.id)}">
          <summary>
            <span class="pm-sites-arrow">&#9656;</span>
            Sites assignés <span class="pm-sites-count">(${assignedCount})</span>
          </summary>
          ${renderPmSitesBody(pm.id)}
        </details>
      </div>`;
  }).join('');

  // Restore open state + search values
  openIds.forEach(id => {
    const el = document.getElementById(`pm-sites-${id}`);
    if (el) el.open = true;
  });
  Object.entries(searchValues).forEach(([pmId, val]) => {
    if (!val) return;
    const input = list.querySelector(`.pm-search input[data-pm-id="${pmId}"]`);
    if (input) {
      input.value = val;
      filterPmSites(input, pmId);
    }
  });
}

// ── Filtre client-side du dropdown des sites ─────────────────────
function filterPmSites(input, pmId) {
  const q = input.value.trim().toLowerCase();
  const body = input.closest('.pm-sites-body');
  if (!body) return;

  // Filtre les chips de la section "attribués"
  body.querySelectorAll('.pm-chip').forEach(chip => {
    const name = chip.dataset.name || '';
    chip.style.display = !q || name.includes(q) ? '' : 'none';
  });

  // Filtre les items de la liste complète
  body.querySelectorAll('.pm-site-item').forEach(item => {
    const name = item.dataset.name || '';
    item.style.display = !q || name.includes(q) ? '' : 'none';
  });
}

// ── Ajout d'une nouvelle ligne (locale, pas encore en BDD) ───────
function addNewPm() {
  const list = document.getElementById('pm-list');
  if (!list) return;
  if (list.querySelector('.pm-empty')) list.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'pm-row';
  row.dataset.pmNew = '1';
  row.innerHTML = `
    <div class="pm-row-main">
      <input class="pm-input pm-name" data-field="first_name" placeholder="Prénom" onblur="onPmBlur(this)">
      <input class="pm-input pm-name" data-field="last_name"  placeholder="Nom"    onblur="onPmBlur(this)">
      <select class="pm-input pm-agency" onchange="onPmBlur(this)">
        ${pmAgencyOptionsHtml('')}
      </select>
      <button class="icon-btn del" onclick="this.closest('.pm-row').remove()" title="Annuler">&#10005;</button>
    </div>`;
  list.appendChild(row);
  row.querySelector('input[data-field="first_name"]').focus();
}

// ── onBlur : création (nouveau row) ou maj prénom/nom ────────────
async function onPmBlur(el) {
  const row = el.closest('.pm-row');
  if (!row) return;
  const isNew    = row.dataset.pmNew === '1';
  const first    = row.querySelector('input[data-field="first_name"]').value.trim();
  const last     = row.querySelector('input[data-field="last_name"]').value.trim();
  const agencyEl = row.querySelector('select.pm-agency');
  const agency   = agencyEl ? agencyEl.value : '';

  if (isNew) {
    if (!first) return;
    try {
      const id = uid();
      const payload = { id, first_name: first, last_name: last, agency: agency || null };
      await sbInsert('eclolink_project_managers', payload);
      projectManagers.push({ id, first_name: first, last_name: last, agency: agency || '' });
      renderPmList();
      toast('Enregistré ✓');
    } catch(e) {
      toast('Erreur : ' + e.message);
      console.error('[onPmBlur create]', e);
    }
    return;
  }

  const id = row.dataset.pmId;
  const pm = projectManagers.find(p => p.id === id);
  if (!pm) return;
  if (pm.first_name === first && pm.last_name === last) return;
  if (!first) {
    el.value = pm.first_name;
    toast('Le prénom est requis');
    return;
  }
  try {
    await sbUpdate('eclolink_project_managers', id, { first_name: first, last_name: last });
    pm.first_name = first;
    pm.last_name  = last;
    render();
  } catch(e) {
    toast('Erreur : ' + e.message);
    console.error('[onPmBlur update]', e);
  }
}

// ── Changement d'agence ─────────────────────────────────────────
async function onPmAgencyChange(id, agency) {
  const pm = projectManagers.find(p => p.id === id);
  if (!pm) return;
  if (pm.agency === (agency || '')) return;
  try {
    await sbUpdate('eclolink_project_managers', id, { agency: agency || null });
    pm.agency = agency || '';
    toast('Enregistré ✓');
  } catch(e) {
    toast('Erreur : ' + e.message);
    console.error('[onPmAgencyChange]', e);
  }
}

// ── Toggle assignation site ↔ cheffe ────────────────────────────
async function togglePmSite(pmId, siteId, checked) {
  const newPmId = checked ? pmId : null;
  const site    = sites.find(s => s.id === siteId);
  if (!site) return;
  const previousPmId = site.project_manager_id;
  if (previousPmId === newPmId) return;

  try {
    await sbUpdate('eclolink_sites', siteId, { project_manager_id: newPmId });
    site.project_manager_id = newPmId;

    // Mettre à jour les checkboxes de TOUTES les cheffes pour ce site
    document.querySelectorAll(`input[type="checkbox"][data-site-id="${siteId}"]`).forEach(cb => {
      cb.checked = cb.dataset.pmId === (newPmId || '');
    });

    // Re-render la section "attribués" + le compteur des cheffes affectées
    [previousPmId, newPmId].filter(Boolean).forEach(pid => {
      const row = document.querySelector(`.pm-row[data-pm-id="${pid}"]`);
      if (!row) return;
      const cnt = row.querySelector('.pm-sites-count');
      if (cnt) cnt.textContent = `(${sites.filter(s => s.project_manager_id === pid).length})`;
      const assignedHost = row.querySelector('.pm-assigned-section');
      if (assignedHost) assignedHost.innerHTML = renderPmAssignedSection(pid);
      // Re-applique le filtre en cours
      const search = row.querySelector('.pm-search input');
      if (search && search.value) filterPmSites(search, pid);
    });

    render(); // tooltips de l'annuaire à jour
  } catch(e) {
    const cb = document.querySelector(`#pm-sites-${pmId} input[data-site-id="${siteId}"]`);
    if (cb) cb.checked = !checked;
    toast('Erreur : ' + e.message);
    console.error('[togglePmSite]', e);
  }
}

// ── Suppression (passe par la modale confirm partagée) ───────────
function deletePm(id) {
  pendingDelete = { type: 'project_manager', id };
  document.getElementById('confirm-msg').textContent =
    'Supprimer cette cheffe de projet ? Les sites assignés seront détachés.';
  openOverlay('confirm-wrap');
}
