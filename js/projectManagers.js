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
  const rows = [...projectManagers].sort(pmSort).map(pm => `
    <div class="pm-row" data-pm-id="${esc(pm.id)}">
      <input type="text" class="pm-input" data-field="first_name"
             value="${esc(pm.first_name)}" placeholder="Prénom"
             onblur="onPmBlur(this)">
      <input type="text" class="pm-input" data-field="last_name"
             value="${esc(pm.last_name)}" placeholder="Nom"
             onblur="onPmBlur(this)">
      <button class="icon-btn del" onclick="deletePm('${esc(pm.id)}')" title="Supprimer">&#10005;</button>
    </div>`).join('');
  list.innerHTML = rows;
}

// ── Ajout d'une nouvelle ligne (locale, pas encore en BDD) ───────
function addNewPm() {
  const list = document.getElementById('pm-list');
  if (!list) return;
  // Si la liste affichait l'état vide, on l'efface d'abord
  if (list.querySelector('.pm-empty')) list.innerHTML = '';
  const row = document.createElement('div');
  row.className = 'pm-row';
  row.dataset.pmNew = '1';
  row.innerHTML = `
    <input type="text" class="pm-input" data-field="first_name" placeholder="Prénom" onblur="onPmBlur(this)">
    <input type="text" class="pm-input" data-field="last_name"  placeholder="Nom"    onblur="onPmBlur(this)">
    <button class="icon-btn del" onclick="this.parentElement.remove()" title="Annuler">&#10005;</button>`;
  list.appendChild(row);
  row.querySelector('input[data-field="first_name"]').focus();
}

// ── onBlur d'un input (création ou mise à jour silencieuse) ──────
async function onPmBlur(input) {
  const row    = input.closest('.pm-row');
  if (!row) return;
  const isNew  = row.dataset.pmNew === '1';
  const first  = row.querySelector('input[data-field="first_name"]').value.trim();
  const last   = row.querySelector('input[data-field="last_name"]').value.trim();

  if (isNew) {
    // On crée seulement quand au moins le prénom est rempli
    if (!first) return;
    try {
      const id = uid();
      await sbInsert('eclolink_project_managers', { id, first_name: first, last_name: last });
      projectManagers.push({ id, first_name: first, last_name: last });
      // Convertir la ligne en ligne "existante"
      delete row.dataset.pmNew;
      row.dataset.pmId = id;
      row.querySelector('.icon-btn.del').setAttribute('onclick', `deletePm('${id}')`);
      toast('Enregistré ✓');
    } catch(e) {
      toast('Erreur : ' + e.message);
      console.error('[onPmBlur create]', e);
    }
    return;
  }

  // Mise à jour d'une cheffe existante
  const id = row.dataset.pmId;
  const pm = projectManagers.find(p => p.id === id);
  if (!pm) return;
  if (pm.first_name === first && pm.last_name === last) return; // pas de changement
  if (!first) {
    // On refuse de vider le prénom (champ requis) — restaure l'ancienne valeur
    input.value = pm.first_name;
    toast('Le prénom est requis');
    return;
  }
  try {
    await sbUpdate('eclolink_project_managers', id, { first_name: first, last_name: last });
    pm.first_name = first;
    pm.last_name  = last;
    // Re-render des lignes assignées dans l'annuaire (le tooltip lit depuis projectManagers donc ok au prochain ouvre)
    render();
  } catch(e) {
    toast('Erreur : ' + e.message);
    console.error('[onPmBlur update]', e);
  }
}

// ── Suppression (passe par la modale confirm partagée) ───────────
function deletePm(id) {
  pendingDelete = { type: 'project_manager', id };
  document.getElementById('confirm-msg').textContent =
    'Supprimer cette cheffe de projet ? Les sites assignés seront détachés.';
  openOverlay('confirm-wrap');
}
