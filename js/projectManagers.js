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

// ── Rendu de la liste ─────────────────────────────────────────────
function renderPmList() {
  const list = document.getElementById('pm-list');
  if (!list) return;
  if (!projectManagers.length) {
    list.innerHTML = `<div class="pm-empty">Aucune cheffe de projet enregistrée.</div>`;
    return;
  }
  const sortedSites = [...sites].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
  list.innerHTML = [...projectManagers].sort(pmSort).map(pm => {
    const assignedCount = sites.filter(s => s.project_manager_id === pm.id).length;
    const sitesItems = sortedSites.length
      ? sortedSites.map(s => {
          const checked = s.project_manager_id === pm.id ? 'checked' : '';
          return `<label class="pm-site-item">
            <input type="checkbox" ${checked}
                   data-pm-id="${esc(pm.id)}" data-site-id="${esc(s.id)}"
                   onchange="togglePmSite('${esc(pm.id)}','${esc(s.id)}',this.checked)">
            <span>${esc(s.name)}</span>
          </label>`;
        }).join('')
      : `<div class="pm-empty-sub">Aucun site enregistré.</div>`;

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
        <details class="pm-sites" id="pm-sites-${esc(pm.id)}">
          <summary>
            <span class="pm-sites-arrow">&#9656;</span>
            Sites assignés <span class="pm-sites-count">(${assignedCount})</span>
          </summary>
          <div class="pm-sites-list">${sitesItems}</div>
        </details>
      </div>`;
  }).join('');
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

// ── onBlur d'un champ : création (si nouveau row) ou maj nom ──────
async function onPmBlur(el) {
  const row = el.closest('.pm-row');
  if (!row) return;
  const isNew    = row.dataset.pmNew === '1';
  const first    = row.querySelector('input[data-field="first_name"]').value.trim();
  const last     = row.querySelector('input[data-field="last_name"]').value.trim();
  const agencyEl = row.querySelector('select.pm-agency');
  const agency   = agencyEl ? agencyEl.value : '';

  if (isNew) {
    if (!first) return; // attend que le prénom soit rempli
    try {
      const id = uid();
      const payload = { id, first_name: first, last_name: last, agency: agency || null };
      await sbInsert('eclolink_project_managers', payload);
      projectManagers.push({ id, first_name: first, last_name: last, agency: agency || '' });
      renderPmList(); // re-render pour afficher le bloc "Sites assignés"
      toast('Enregistré ✓');
    } catch(e) {
      toast('Erreur : ' + e.message);
      console.error('[onPmBlur create]', e);
    }
    return;
  }

  // Maj cheffe existante (prénom / nom uniquement ici)
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
    render(); // tooltips à jour
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

    // Décocher la case du site dans toutes les autres cheffes (un site = 1 seule cheffe)
    document.querySelectorAll(`input[type="checkbox"][data-site-id="${siteId}"]`).forEach(cb => {
      cb.checked = cb.dataset.pmId === (newPmId || '');
    });

    // Mettre à jour le compteur de l'ancienne cheffe
    if (previousPmId) {
      const cnt = document.querySelector(`#pm-sites-${previousPmId} .pm-sites-count`);
      if (cnt) cnt.textContent = `(${sites.filter(s => s.project_manager_id === previousPmId).length})`;
    }
    // Et celui de la nouvelle
    if (newPmId) {
      const cnt = document.querySelector(`#pm-sites-${newPmId} .pm-sites-count`);
      if (cnt) cnt.textContent = `(${sites.filter(s => s.project_manager_id === newPmId).length})`;
    }
    render(); // tooltip site à jour
  } catch(e) {
    // revert visual
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
