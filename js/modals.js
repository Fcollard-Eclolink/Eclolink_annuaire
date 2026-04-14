// ── Select custom ─────────────────────────────────────────────────
function customSelectHTML(inputId, options, selectedValue, placeholder) {
  const selectedLabel = options.find(o => o.value === selectedValue)?.label || '';
  const optsHTML = options.map(o => `
    <div class="custom-select-opt${o.value === selectedValue ? ' selected' : ''}" data-value="${esc(o.value)}" onclick="pickCustomSelect('${inputId}', this)">
      ${esc(o.label)}
    </div>`).join('');
  return `
    <div class="custom-select" id="csel-${inputId}">
      <div class="custom-select-box" id="csel-box-${inputId}" onclick="toggleCustomSelect('${inputId}')">
        <span id="csel-val-${inputId}">${selectedLabel ? esc(selectedLabel) : `<span class="custom-select-placeholder">${esc(placeholder)}</span>`}</span>
        <span class="custom-select-caret">&#9662;</span>
      </div>
      <div class="custom-select-dd" id="csel-dd-${inputId}">${optsHTML}</div>
    </div>
    <input type="hidden" id="${inputId}" value="${esc(selectedValue || '')}">`;
}

function toggleCustomSelect(inputId) {
  const dd  = document.getElementById(`csel-dd-${inputId}`);
  const box = document.getElementById(`csel-box-${inputId}`);
  if (!dd || !box) return;
  const wasOpen = dd.classList.contains('open');
  // ferme tous les autres
  document.querySelectorAll('.custom-select-dd.open').forEach(el => el.classList.remove('open'));
  document.querySelectorAll('.custom-select-box.open').forEach(el => el.classList.remove('open'));
  if (!wasOpen) {
    const rect = box.getBoundingClientRect();
    dd.style.top   = (rect.bottom + 4) + 'px';
    dd.style.left  = rect.left + 'px';
    dd.style.width = rect.width + 'px';
    dd.classList.add('open');
    box.classList.add('open');
  }
}

function pickCustomSelect(inputId, el) {
  const value = el.dataset.value;
  const label = el.textContent.trim();
  document.getElementById(inputId).value = value;
  const valEl = document.getElementById(`csel-val-${inputId}`);
  if (valEl) valEl.innerHTML = value
    ? esc(label)
    : `<span class="custom-select-placeholder">— Aucune —</span>`;
  const dd = document.getElementById(`csel-dd-${inputId}`);
  if (dd) {
    dd.querySelectorAll('.custom-select-opt').forEach(o => o.classList.toggle('selected', o.dataset.value === value));
    dd.classList.remove('open');
  }
  document.getElementById(`csel-box-${inputId}`)?.classList.remove('open');
}

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
  const wrap = document.getElementById('confirm-wrap');
  wrap.classList.remove('open');
  delete wrap.dataset.action;
  delete wrap.dataset.urls;
  document.getElementById('confirm-title').textContent = 'Confirmer la suppression';
  wrap.querySelector('.btn-danger').textContent = 'Supprimer';
  if (!document.getElementById('modal-wrap').classList.contains('open'))
    document.body.classList.remove('modal-open');
  pendingDelete = null;
}

// ── Modal serveur ─────────────────────────────────────────────────
function openServerModal(id) {
  modalMode = 'server'; editId = id || null;
  const g = id ? groups.find(g => g.id === id) : null;

  const wsOptions = [
    { value: '',       label: '— Aucun —' },
    { value: 'apache', label: 'Apache'    },
    { value: 'nginx',  label: 'Nginx'     },
  ];

  document.getElementById('modal-title').textContent = id ? 'Modifier le serveur' : 'Nouveau serveur';
  document.getElementById('modal-body').innerHTML = `
    <div class="field">
      <label>Nom du serveur</label>
      <input id="f-name" type="text" value="${esc(g ? g.name : '')}" placeholder="Ex : Serveur 1, OVH-VPS...">
    </div>
    <div class="field">
      <label>IP publique</label>
      <input id="f-ip-public" type="text" value="${esc(g ? g.ip_public || '' : '')}" placeholder="5.5.5.5">
    </div>
    <div class="field">
      <label>IP locale</label>
      <input id="f-ip-local" type="text" value="${esc(g ? g.ip_local || '' : '')}" placeholder="192.168.1.10">
    </div>
    <div class="field">
      <label>Serveur web</label>
      ${customSelectHTML('f-webserver', wsOptions, g?.web_server || '', '— Aucun —')}
    </div>`;
  openOverlay('modal-wrap');
  setTimeout(() => document.getElementById('f-name')?.focus(), 60);
}

// ── Modal site ────────────────────────────────────────────────────
function openSiteModal(id, pgid) {
  modalMode = 'site'; editId = id || null; preGroupId = pgid || null;
  const s    = id ? sites.find(s => s.id === id) : null;
  const sel  = s ? s.groupId : pgid;
  const serverOptions = [
    { value: '', label: '— Sans serveur —' },
    ...groups
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }))
      .map(g => ({ value: g.id, label: g.name }))
  ];

  const agencyOptions = [
    { value: '', label: '— Aucune —' },
    ...AGENCIES.map(ag => ({ value: ag, label: ag }))
  ];

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
      ${customSelectHTML('f-agency', agencyOptions, s?.agency || '', '— Aucune —')}
    </div>
    <div class="field">
      <label>Date de mise en ligne</label>
      <div class="date-wrap">
        <input id="f-date" type="date" value="${esc(s ? s.go_live_date || '' : '')}">
        <span class="date-icon">&#128197;</span>
      </div>
    </div>
    <div class="field">
      <label>Serveur</label>
      ${customSelectHTML('f-group', serverOptions, sel || '', '— Sans serveur —')}
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
      if (!name) { btn.disabled = false; btn.textContent = 'Enregistrer'; toast('Le nom du serveur est requis'); return; }
      const obj = {
        name,
        ip_local  : (document.getElementById('f-ip-local').value  || '').trim(),
        ip_public : (document.getElementById('f-ip-public').value || '').trim(),
        web_server: document.getElementById('f-webserver')?.value || null,
      };
      if (editId) {
        await sbUpdate('eclolink_groups', editId, obj);
        groups = groups.map(g => g.id === editId ? { ...g, ...obj } : g);
      } else {
        const id = uid();
        await sbInsert('eclolink_groups', { id, ...obj });
        groups.push({ id, ...obj });
      }
    } else if (modalMode === 'site') {
      const name = (document.getElementById('f-name').value || '').trim();
      if (!name) { btn.disabled = false; btn.textContent = 'Enregistrer'; toast('Le nom du site est requis'); return; }
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
  } catch(e) {
    const detail = e.details || e.hint || e.code;
    toast('Erreur : ' + e.message + (detail ? ` (${detail})` : ''));
    console.error('[saveModal]', e);
  } finally { btn.disabled = false; btn.textContent = 'Enregistrer'; }
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
  const wrap = document.getElementById('confirm-wrap');
  if (wrap.dataset.action === 'open-urls') {
    const urls = JSON.parse(wrap.dataset.urls || '[]');
    closeConfirm();
    executeOpenUrls(urls);
    return;
  }
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
