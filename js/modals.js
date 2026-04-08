// ── Overlay ───────────────────────────────────────────────────────
function openOverlay(id) {
  document.getElementById(id).classList.add('open');
  document.body.classList.add('modal-open');
}

function closeModal() {
  document.getElementById('modal-wrap').classList.remove('open');
  if (!document.getElementById('confirm-wrap').classList.contains('open'))
    document.body.classList.remove('modal-open');
  modalMode = null; editId = null; preGroupId = null;
}

function closeConfirm() {
  document.getElementById('confirm-wrap').classList.remove('open');
  if (!document.getElementById('modal-wrap').classList.contains('open'))
    document.body.classList.remove('modal-open');
  pendingDelete = null;
}

// ── Modal serveur ─────────────────────────────────────────────────
function openServerModal(id) {
  modalMode = 'server'; editId = id || null;
  const g = id ? groups.find(g => g.id === id) : null;
  document.getElementById('modal-title').textContent = id ? 'Renommer le serveur' : 'Nouveau serveur';
  document.getElementById('modal-body').innerHTML = `
    <div class="field">
      <label>Nom du serveur</label>
      <input id="f-name" type="text" value="${esc(g ? g.name : '')}" placeholder="Ex : Serveur 1, OVH-VPS...">
    </div>`;
  openOverlay('modal-wrap');
  setTimeout(() => document.getElementById('f-name')?.focus(), 60);
}

// ── Modal site ────────────────────────────────────────────────────
function openSiteModal(id, pgid) {
  modalMode = 'site'; editId = id || null; preGroupId = pgid || null;
  const s    = id ? sites.find(s => s.id === id) : null;
  const sel  = s ? s.groupId : pgid;
  const opts = groups
    .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
    .map(g => `<option value="${g.id}"${sel === g.id ? ' selected' : ''}>${esc(g.name)}</option>`)
    .join('');

  const agencyOpts = AGENCIES.map(ag =>
    `<option value="${ag}"${(s?.agency || '') === ag ? ' selected' : ''}>${esc(ag)}</option>`
  ).join('');

  const techOpts = TECHS.map(t => `
    <label class="tech-option">
      <input type="checkbox" value="${t.id}" onchange="updateTechBox()">
      ${techIconHTML(t, 15)}
      ${esc(t.label)}
    </label>`).join('');

  document.getElementById('modal-title').textContent = id ? 'Modifier le site' : 'Nouveau site';
  document.getElementById('modal-body').innerHTML = `
    <div class="field">
      <label>Nom du site *</label>
      <input id="f-name" type="text" value="${esc(s ? s.name : '')}" placeholder="Ex : Hôtel Mercure Dijon">
    </div>
    <div class="field">
      <label>URL</label>
      <input id="f-url" type="text" value="${esc(s ? s.url : '')}" placeholder="https://...">
    </div>
    <div class="field">
      <label>GitLab</label>
      <input id="f-gitlab" type="text" value="${esc(s ? s.gitlab_url || '' : '')}" placeholder="https://gitlab.com/...">
    </div>
    <div class="field">
      <label>Version PHP</label>
      <input id="f-php" type="text" value="${esc(s ? s.php_version || '' : '')}" placeholder="Ex : PHP 8.1, PHP 8.2...">
    </div>
    <div class="field">
      <label>Agence</label>
      <select id="f-agency">
        <option value="">— Aucune —</option>
        ${agencyOpts}
      </select>
    </div>
    <div class="field">
      <label>Date de mise en ligne</label>
      <input id="f-date" type="date" value="${esc(s ? s.go_live_date || '' : '')}">
    </div>
    <div class="field">
      <label>Serveur</label>
      <select id="f-group"><option value="">— Sans serveur —</option>${opts}</select>
    </div>
    <div class="field">
      <label>Technologies</label>
      <div class="tech-select" id="tech-select">
        <div class="tech-select-box" id="tech-box" onclick="toggleTechDropdown()">
          <span class="tech-placeholder">Sélectionner...</span>
        </div>
        <div class="tech-dropdown" id="tech-dropdown">${techOpts}</div>
      </div>
    </div>
    <div class="field">
      <label>Notes</label>
      <textarea id="f-notes" placeholder="Infos utiles, WP-Admin, FTP...">${esc(s ? s.notes : '')}</textarea>
    </div>`;

  openOverlay('modal-wrap');
  setTimeout(() => {
    document.getElementById('f-name')?.focus();
    if (s?.technologies?.length) {
      s.technologies.forEach(tid => {
        const cb = document.querySelector(`#tech-dropdown input[value="${tid}"]`);
        if (cb) cb.checked = true;
      });
      updateTechBox();
    }
  }, 60);
}

// ── Sauvegarde ────────────────────────────────────────────────────
async function saveModal() {
  const btn = document.getElementById('save-btn');
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>Enregistrement...';
  try {
    if (modalMode === 'server') {
      const name = (document.getElementById('f-name').value || '').trim();
      if (!name) { btn.disabled = false; btn.textContent = 'Enregistrer'; return; }
      if (editId) {
        await sbUpdate('eclolink_groups', editId, { name });
        groups = groups.map(g => g.id === editId ? { ...g, name } : g);
      } else {
        const id = uid();
        await sbInsert('eclolink_groups', { id, name });
        groups.push({ id, name });
      }
    } else if (modalMode === 'site') {
      const name = (document.getElementById('f-name').value || '').trim();
      if (!name) { btn.disabled = false; btn.textContent = 'Enregistrer'; return; }
      const techs     = getSelectedTechs();
      const dateVal   = document.getElementById('f-date').value || null;
      const agencyVal = document.getElementById('f-agency').value || null;
      const obj = {
        name,
        url         : (document.getElementById('f-url').value    || '').trim(),
        gitlab_url  : (document.getElementById('f-gitlab').value || '').trim(),
        php_version : (document.getElementById('f-php').value    || '').trim(),
        agency      : agencyVal,
        go_live_date: dateVal,
        group_id    : document.getElementById('f-group').value   || null,
        technologies: JSON.stringify(techs),
        notes       : (document.getElementById('f-notes').value  || '').trim()
      };
      if (editId) {
        await sbUpdate('eclolink_sites', editId, obj);
        sites = sites.map(s => s.id === editId
          ? { ...s, ...obj, groupId: obj.group_id, technologies: techs }
          : s);
      } else {
        const id = uid();
        await sbInsert('eclolink_sites', { id, ...obj });
        sites.push({ id, ...obj, groupId: obj.group_id, technologies: techs });
      }
    }
    closeModal(); render(); toast('Enregistré ✓');
  } catch(e) { toast('Erreur : ' + e.message); }
  finally { btn.disabled = false; btn.textContent = 'Enregistrer'; }
}

// ── Suppression ───────────────────────────────────────────────────
function deleteServer(id) {
  pendingDelete = { type: 'server', id };
  document.getElementById('confirm-msg').textContent = 'Supprimer ce serveur ? Les sites seront déplacés dans "Sans serveur".';
  openOverlay('confirm-wrap');
}

function deleteSite(id) {
  pendingDelete = { type: 'site', id };
  document.getElementById('confirm-msg').textContent = 'Supprimer ce site définitivement ?';
  openOverlay('confirm-wrap');
}

async function executeDelete() {
  if (!pendingDelete) return;
  const { type, id } = pendingDelete;
  closeConfirm();
  try {
    if (type === 'server') {
      await sbDelete('eclolink_groups', id);
      const orphans = sites.filter(s => s.groupId === id);
      await Promise.all(orphans.map(s => sbUpdate('eclolink_sites', s.id, { group_id: null })));
      groups = groups.filter(g => g.id !== id);
      sites  = sites.map(s => s.groupId === id ? { ...s, groupId: null, group_id: null } : s);
      toast('Serveur supprimé');
    } else {
      await sbDelete('eclolink_sites', id);
      sites = sites.filter(s => s.id !== id);
      toast('Site supprimé');
    }
    render();
  } catch(e) { toast('Erreur : ' + e.message); }
}
