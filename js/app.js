// ── Chargement des données ────────────────────────────────────────
async function load(showToast) {
  document.getElementById('list').innerHTML = '<div class="no-result">Chargement…</div>';
  loadCollapsed();
  try {
    const [groupsRaw, sitesRaw] = await Promise.all([sbGet('eclolink_groups'), sbGet('eclolink_sites')]);
    groups = groupsRaw.map(g => ({
      ...g,
      ip_local  : g.ip_local   || '',
      ip_public : g.ip_public  || '',
      web_server: g.web_server || ''
    }));
    sites = sitesRaw.map(s => ({
      ...s,
      groupId     : s.group_id,
      bo_url      : s.bo_url        || '',
      gitlab_url  : s.gitlab_url    || '',
      php_version : s.php_version   || '',
      agency      : s.agency        || '',
      go_live_date: s.go_live_date  || '',
      technologies: tryParseJSON(s.technologies)
    }));
    render();
    if (showToast) toast('Données actualisées');
  } catch(e) {
    document.getElementById('list').innerHTML = `<div class="load-error">Erreur de connexion à Supabase.<br>${esc(e.message)}</div>`;
  }
}

// ── Raccourcis clavier ────────────────────────────────────────────
document.addEventListener('keydown', e => {
  const ctrl      = e.ctrlKey || e.metaKey;
  const isConfirm = document.getElementById('confirm-wrap').classList.contains('open');
  const isModal   = document.getElementById('modal-wrap').classList.contains('open');

  if (!isConfirm && !isModal) {
    if (ctrl && e.key === 'k')                    { e.preventDefault(); document.getElementById('search')?.focus(); return; }
    if (ctrl && e.shiftKey && e.key === 'G')      { e.preventDefault(); openServerModal(); return; }
    if (ctrl && e.shiftKey && e.key === 'S')      { e.preventDefault(); openSiteModal();   return; }
  }

  if (isConfirm) {
    if (e.key === 'Escape') { e.preventDefault(); closeConfirm(); }
    if (e.key === 'Enter')  { e.preventDefault(); executeDelete(); }
    return;
  }
  if (isModal) {
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); }
    if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); saveModal(); }
  }
});

// ── Fermeture des dropdowns au clic extérieur ────────────────────
document.addEventListener('click', e => {
  // tech dropdown (modal)
  const sel = document.getElementById('tech-select');
  if (sel && !sel.contains(e.target))
    document.getElementById('tech-dropdown')?.classList.remove('open');

  // server info tooltip
  const tt = document.getElementById('server-tooltip');
  if (tt && tt.classList.contains('open') && !tt.contains(e.target)) hideServerInfo();

  // custom selects
  document.querySelectorAll('.custom-select-dd.open').forEach(dd => {
    const wrap = dd.closest('.custom-select');
    if (wrap && !wrap.contains(e.target)) {
      dd.classList.remove('open');
      wrap.querySelector('.custom-select-box')?.classList.remove('open');
    }
  });
});

// ── Ouvrir tous les URLs d'un serveur ────────────────────────────
function openAllSiteUrls(gid) {
  const g    = groups.find(x => x.id === gid);
  const urls = sites.filter(s => s.groupId === gid && s.url).map(s => s.url);
  if (!urls.length) return;
  pendingDelete = null; // ne pas interférer avec la suppression
  document.getElementById('confirm-title').textContent = 'Ouvrir tous les sites';
  document.getElementById('confirm-msg').textContent =
    `Ouvrir les ${urls.length} site${urls.length > 1 ? 's' : ''} du serveur "${g ? g.name : ''}" dans de nouveaux onglets ?`;
  document.getElementById('confirm-wrap').dataset.action = 'open-urls';
  document.getElementById('confirm-wrap').dataset.urls   = JSON.stringify(urls);
  document.querySelector('#confirm-wrap .btn-danger').textContent = 'Ouvrir';
  openOverlay('confirm-wrap');
}

function executeOpenUrls(urls) {
  urls.forEach((url, i) => {
    setTimeout(() => {
      const a = document.createElement('a');
      a.href = url; a.target = '_blank'; a.rel = 'noopener noreferrer';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }, i * 150);
  });
}

// ── Point d'entrée ────────────────────────────────────────────────
initTheme();
initAuth();
