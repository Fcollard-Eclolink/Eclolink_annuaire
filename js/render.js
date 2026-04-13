// ── Rendu de la liste ─────────────────────────────────────────────
function render() {
  const q          = (document.getElementById('search').value || '').trim().toLowerCase();
  const list       = document.getElementById('list');
  const hasFilters = activeFilters.servers.length > 0
                  || activeFilters.techs.length   > 0
                  || activeFilters.agencies.length > 0;
  let html         = '';

  const filtered = sites.filter(s => {
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
    if (activeFilters.servers.length  && !activeFilters.servers.includes(s.groupId)) return false;
    if (activeFilters.techs.length    && !activeFilters.techs.some(t => (s.technologies || []).includes(t))) return false;
    if (activeFilters.agencies.length && !activeFilters.agencies.includes(s.agency)) return false;
    return true;
  });

  if (q || hasFilters) {
    if (!filtered.length) {
      html = `<div class="no-result">Aucun résultat${q ? ` pour "${esc(q)}"` : ''}</div>`;
    } else {
      html += `<div class="group-card"><div class="group-body">`;
      [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })).forEach(s => {
        const g = groups.find(g => g.id === s.groupId);
        html += rowHTML(s, q, g ? g.name : '');
      });
      html += `</div></div>`;
    }
  } else {
    const ungrouped = sites
      .filter(s => !s.groupId || !groups.find(g => g.id === s.groupId))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));

    [...groups].sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true })).forEach(g => {
      const gs   = sites.filter(s => s.groupId === g.id).sort((a, b) => a.name.localeCompare(b.name, 'fr', { numeric: true }));
      const open = !collapsed[g.id];
      const wsMeta = g.web_server
        ? `<span class="tag tag-ws"><img src="${SI}/${g.web_server}" width="11" height="11" alt="" onerror="this.style.display='none'" style="display:inline-block;vertical-align:middle;margin-right:3px">${esc(g.web_server)}</span>`
        : '';
      const serverMeta = [
        g.ip_local  ? `<span class="tag tag-ip">&#x1F4BB; ${esc(g.ip_local)}</span>`  : '',
        g.ip_public ? `<span class="tag tag-ip">&#x1F310; ${esc(g.ip_public)}</span>` : '',
        wsMeta,
      ].filter(Boolean).join('');

      html += `
        <div class="group-card">
          <div class="group-head" onclick="toggleGroup('${g.id}')">
            <span class="chevron ${open ? 'open' : ''}">&#9654;</span>
            <div class="group-head-info">
              <span class="group-name">${esc(g.name)}</span>
              ${serverMeta ? `<div class="group-meta">${serverMeta}</div>` : ''}
            </div>
            <span class="group-count">${gs.length}</span>
            <div class="group-actions" onclick="event.stopPropagation()">
              <button class="icon-btn" onclick="openServerModal('${g.id}')" title="Renommer">&#9998;</button>
              <button class="icon-btn del" onclick="deleteServer('${g.id}')" title="Supprimer">&#10005;</button>
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
  const techBadges = (s.technologies || []).map(tid => {
    const t = TECHS.find(x => x.id === tid);
    return t ? `<span class="tech-badge">${techIconHTML(t, 12)}${esc(t.label)}</span>` : '';
  }).join('');

  const dateStr = formatDate(s.go_live_date);

  return `
    <div class="site-row">
      <div class="site-info">
        <div class="site-name">${hl(s.name, q)}</div>
        <div class="site-meta">
          ${s.url         ? `<a class="icon-link" href="${esc(s.url)}" target="_blank" title="${esc(s.url)}">${SVG_EXT}</a>` : ''}
          ${s.gitlab_url  ? `<a class="icon-link" href="${esc(s.gitlab_url)}" target="_blank" title="GitLab">${SVG_GL}</a>` : ''}
          ${s.php_version ? `<span class="tag">${hl(s.php_version, q)}</span>` : ''}
          ${s.agency      ? `<span class="tag tag-agency">${hl(s.agency, q)}</span>` : ''}
          ${dateStr       ? `<span class="tag tag-date">&#128197; ${esc(dateStr)}</span>` : ''}
          ${srvLabel      ? `<span class="tag tag-server">${esc(srvLabel)}</span>` : ''}
          ${techBadges}
          ${s.notes       ? `<span class="site-notes">${hl(s.notes, q)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="openSiteModal('${s.id}')" title="Modifier">&#9998;</button>
        <button class="icon-btn del" onclick="deleteSite('${s.id}')" title="Supprimer">&#10005;</button>
      </div>
    </div>`;
}

// ── Barre de recherche ────────────────────────────────────────────
function onSearchInput() {
  render();
  refreshOpenDropdowns();
  const hasValue = !!document.getElementById('search').value;
  const btn = document.getElementById('search-clear');
  if (btn) btn.style.display = hasValue ? 'flex' : 'none';
}

function clearSearch() {
  const input = document.getElementById('search');
  input.value = '';
  onSearchInput();
  input.focus();
}

function toggleGroup(id) {
  collapsed[id] = !collapsed[id];
  saveCollapsed();
  render();
}
