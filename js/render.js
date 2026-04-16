// ── Rendu de la liste ─────────────────────────────────────────────
function render() {
  const q          = (document.getElementById('search').value || '').trim().toLowerCase();
  const list       = document.getElementById('list');
  const hasFilters = activeFilters.servers.length > 0
                  || activeFilters.techs.length   > 0
                  || activeFilters.agencies.length > 0;

  // Maps pour accès O(1) au lieu de find() O(n) dans les boucles
  const groupById    = new Map(groups.map(g => [g.id, g]));
  const sitesByGroup = new Map(groups.map(g => [g.id, []]));
  sitesByGroup.set('__none__', []);
  sites.forEach(s => {
    const bucket = sitesByGroup.get(s.groupId) ?? sitesByGroup.get('__none__');
    bucket.push(s);
  });

  const localeSort = (a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true });

  const filtered = sites.filter(s => {
    if (q) {
      const g = groupById.get(s.groupId);
      if (!(s.name || '').toLowerCase().includes(q)
       && !(s.url  || '').toLowerCase().includes(q)
       && !(g ? g.name : '').toLowerCase().includes(q)) return false;
    }
    if (activeFilters.servers.length  && !activeFilters.servers.includes(s.groupId)) return false;
    if (activeFilters.techs.length    && !activeFilters.techs.some(t => (s.technologies || []).includes(t))) return false;
    if (activeFilters.agencies.length && !activeFilters.agencies.includes(s.agency)) return false;
    return true;
  });

  let html = '';

  if (q || hasFilters) {
    if (!filtered.length) {
      html = `<div class="no-result">Aucun résultat${q ? ` pour "${esc(q)}"` : ''}</div>`;
    } else {
      html += `<div class="group-card"><div class="group-body">`;
      [...filtered].sort(localeSort).forEach(s => {
        const g = groupById.get(s.groupId);
        html += rowHTML(s, q, g ? g.name : '');
      });
      html += `</div></div>`;
    }
  } else {
    [...groups].sort(localeSort).forEach(g => {
      const gs   = (sitesByGroup.get(g.id) || []).slice().sort(localeSort);
      const open = !collapsed[g.id];
      const hasInfo = g.hoster || g.ip_local || g.ip_public || g.web_server;

      html += `
        <div class="group-card">
          <div class="group-head" onclick="toggleGroup('${g.id}')">
            <span class="chevron ${open ? 'open' : ''}">&#9654;</span>
            <span class="group-name">${esc(g.name)}</span>
            <span class="group-count">${gs.length}</span>
            <div class="group-actions" onclick="event.stopPropagation()">
              <div class="group-actions-info">
                ${hasInfo ? `<button class="icon-btn" onclick="toggleServerInfo('${g.id}',this)" title="Informations">&#x2139;</button>` : ''}
                ${gs.some(s => s.url) ? `<button class="icon-btn" onclick="openAllSiteUrls('${g.id}')" title="Ouvrir tous les sites">${SVG_EXT}</button>` : ''}
              </div>
              <div class="group-actions-crud">
                <button class="icon-btn" onclick="openServerModal('${g.id}')" title="Modifier">&#9998;</button>
                <button class="icon-btn del" onclick="deleteServer('${g.id}')" title="Supprimer">&#10005;</button>
              </div>
            </div>
          </div>`;
      if (open) {
        html += `<div class="group-body">`;
        if (!gs.length) html += `<div class="empty-group">Aucun site dans ce serveur.</div>`;
        gs.forEach(s => { html += rowHTML(s, q); });
        html += `<div class="add-site" onclick="openSiteModal(null,'${g.id}')">&#43; Ajouter un site</div></div>`;
      }
      html += `</div>`;
    });

    const ungrouped = (sitesByGroup.get('__none__') || []).slice().sort(localeSort);
    if (ungrouped.length) {
      const open = !collapsed['__none__'];
      html += `
        <div class="group-card">
          <div class="group-head" onclick="toggleGroup('__none__')">
            <span class="chevron ${open ? 'open' : ''}">&#9654;</span>
            <span class="group-name muted">Sans serveur</span>
            <span class="group-count">${ungrouped.length}</span>
          </div>`;
      if (open) {
        html += `<div class="group-body">`;
        ungrouped.forEach(s => { html += rowHTML(s, q); });
        html += `</div>`;
      }
      html += `</div>`;
    }

    if (!groups.length && !sites.length) {
      html = `<div class="empty">Aucun site enregistré.<br>Commencez par créer un serveur, puis ajoutez des sites.</div>`;
    }
  }

  list.innerHTML = html;
}

// ── Ligne d'un site ───────────────────────────────────────────────
function rowHTML(s, q, srvLabel) {
  const techBadges = (s.technologies || [])
    .map(tid => TECH_BY_ID.get(tid))
    .filter(Boolean)
    .sort((a, b) => a.label.localeCompare(b.label, 'fr'))
    .map(t => `<span class="tech-badge">${techIconHTML(t, 12)}${esc(t.label)}</span>`)
    .join('');

  const dateStr = formatDate(s.go_live_date);
  const hasInfo = s.php_version || s.dns_zone;

  return `
    <div class="site-row">
      <div class="site-info">
        <div class="site-name">${hl(s.name, q)}</div>
        <div class="site-meta">
          ${s.url        ? `<a class="icon-link" href="${esc(s.url)}" target="_blank" title="${esc(s.url)}">${SVG_SITE}</a>` : ''}
          ${s.bo_url     ? `<a class="icon-link" href="${esc(s.bo_url)}" target="_blank" title="Back-office">${SVG_BO}</a>` : ''}
          ${s.gitlab_url ? `<a class="icon-link" href="${esc(s.gitlab_url)}" target="_blank" title="GitLab">${SVG_GL}</a>` : ''}
          ${s.agency     ? `<span class="tag tag-agency">${esc(s.agency)}</span>` : ''}
          ${dateStr      ? `<span class="tag tag-date">&#128197; ${esc(dateStr)}</span>` : ''}
          ${srvLabel     ? `<span class="tag tag-server">${esc(srvLabel)}</span>` : ''}
          ${techBadges}
          ${s.notes      ? `<span class="site-notes">${esc(s.notes)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        ${hasInfo ? `<button class="icon-btn" onclick="toggleSiteInfo('${s.id}',this);event.stopPropagation()" title="Informations">&#x2139;</button>` : ''}
        <button class="icon-btn" onclick="openSiteModal('${s.id}')" title="Modifier">&#9998;</button>
        <button class="icon-btn del" onclick="deleteSite('${s.id}')" title="Supprimer">&#10005;</button>
      </div>
    </div>`;
}

// ── Barre de recherche ────────────────────────────────────────────
function onSearchInput() {
  render();
  refreshOpenDropdowns();
  const btn = document.getElementById('search-clear');
  if (btn) btn.style.display = document.getElementById('search').value ? 'flex' : 'none';
}

function clearSearch() {
  const input = document.getElementById('search');
  input.value = '';
  onSearchInput();
  input.focus();
}

// ── Positionnement d'un tooltip (partagé) ────────────────────────
function positionTooltip(tt, btn) {
  const rect      = btn.getBoundingClientRect();
  const ttW       = 220;
  tt.style.left   = Math.min(rect.left, window.innerWidth - ttW - 8) + 'px';
  const spaceBelow = window.innerHeight - rect.bottom;
  tt.style.top    = spaceBelow >= 100
    ? (rect.bottom + 6) + 'px'
    : (rect.top - tt.offsetHeight - 6) + 'px';
}

// ── Popover infos serveur ─────────────────────────────────────────
function toggleServerInfo(gid, btn) {
  const tt = document.getElementById('server-tooltip');
  if (!tt) return;
  if (tt.dataset.gid === gid && tt.classList.contains('open')) { hideServerInfo(); return; }
  const g = groups.find(x => x.id === gid);
  if (!g) return;

  const rows = [];
  if (g.hoster) {
    const h = HOSTERS.find(x => x.value === g.hoster);
    rows.push(`<div class="sti-row"><span class="sti-label">Hébergeur</span><span class="sti-val"><img src="${SI}/${h ? h.slug : g.hoster}" width="12" height="12" alt="" onerror="this.style.display='none'" style="vertical-align:middle;margin-right:4px;flex-shrink:0">${esc(h ? h.label : g.hoster)}</span></div>`);
  }
  if (g.ip_public)  rows.push(`<div class="sti-row"><span class="sti-label">IP publique</span><span class="sti-val">${esc(g.ip_public)}<button class="sti-copy" onclick="copyToClipboard('${esc(g.ip_public)}',this)" title="Copier">${SVG_COPY}</button></span></div>`);
  if (g.ip_local)   rows.push(`<div class="sti-row"><span class="sti-label">IP locale</span><span class="sti-val">${esc(g.ip_local)}<button class="sti-copy" onclick="copyToClipboard('${esc(g.ip_local)}',this)" title="Copier">${SVG_COPY}</button></span></div>`);
  if (g.web_server) rows.push(`<div class="sti-row"><span class="sti-label">Serveur web</span><span class="sti-val"><img src="${SI}/${g.web_server}" width="12" height="12" alt="" onerror="this.style.display='none'" style="vertical-align:middle;margin-right:4px">${esc(g.web_server)}</span></div>`);
  if (!rows.length) return;

  tt.innerHTML = rows.join('');
  tt.dataset.gid = gid;
  tt.classList.add('open');
  positionTooltip(tt, btn);
}

function hideServerInfo() {
  const tt = document.getElementById('server-tooltip');
  if (tt) { tt.classList.remove('open'); delete tt.dataset.gid; }
}

// ── Popover infos site ────────────────────────────────────────────
function toggleSiteInfo(sid, btn) {
  const tt = document.getElementById('site-tooltip');
  if (!tt) return;
  if (tt.dataset.sid === sid && tt.classList.contains('open')) { hideSiteInfo(); return; }
  const s = sites.find(x => x.id === sid);
  if (!s) return;

  const rows = [];
  if (s.php_version) rows.push(`<div class="sti-row"><span class="sti-label">Version PHP</span><span class="sti-val">${esc(s.php_version)}</span></div>`);
  if (s.dns_zone) {
    const dns = DNS_PROVIDERS.find(d => d.value === s.dns_zone);
    rows.push(`<div class="sti-row"><span class="sti-label">Zone DNS</span><span class="sti-val"><img src="${SI}/${esc(s.dns_zone)}" width="12" height="12" alt="" onerror="this.style.display='none'" style="vertical-align:middle;margin-right:4px;flex-shrink:0">${esc(dns ? dns.label : s.dns_zone)}</span></div>`);
  }
  if (!rows.length) return;

  tt.innerHTML = rows.join('');
  tt.dataset.sid = sid;
  tt.classList.add('open');
  positionTooltip(tt, btn);
}

function hideSiteInfo() {
  const tt = document.getElementById('site-tooltip');
  if (tt) { tt.classList.remove('open'); delete tt.dataset.sid; }
}

function toggleGroup(id) {
  collapsed[id] = !collapsed[id];
  saveCollapsed();
  render();
}
