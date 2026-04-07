// ── Rendu de la liste ─────────────────────────────────────────────
function render() {
  const q    = (document.getElementById('search').value || '').trim().toLowerCase();
  const list = document.getElementById('list');
  let html   = '';

  const filtered = sites.filter(s => {
    if (!q) return true;
    return (s.name   || '').toLowerCase().includes(q)
        || (s.url    || '').toLowerCase().includes(q)
        || (s.server || '').toLowerCase().includes(q)
        || (s.notes  || '').toLowerCase().includes(q);
  });

  if (q) {
    if (!filtered.length) {
      html = `<div class="no-result">Aucun résultat pour "${esc(q)}"</div>`;
    } else {
      html += `<div class="group-card"><div class="group-body">`;
      filtered.forEach(s => {
        const g = groups.find(g => g.id === s.groupId);
        html += rowHTML(s, q, g ? g.name : '');
      });
      html += `</div></div>`;
    }
  } else {
    const ungrouped = sites.filter(s => !s.groupId || !groups.find(g => g.id === s.groupId));

    groups.forEach(g => {
      const gs   = sites.filter(s => s.groupId === g.id);
      const open = !collapsed[g.id];
      html += `
        <div class="group-card">
          <div class="group-head" onclick="toggleGroup('${g.id}')">
            <span class="chevron ${open ? 'open' : ''}">&#9654;</span>
            <span class="group-name">${esc(g.name)}</span>
            <span class="group-count">${gs.length}</span>
            <div class="group-actions" onclick="event.stopPropagation()">
              <button class="icon-btn" onclick="openGroupModal('${g.id}')" title="Renommer">&#9998;</button>
              <button class="icon-btn del" onclick="deleteGroup('${g.id}')" title="Supprimer">&#10005;</button>
            </div>
          </div>`;
      if (open) {
        html += `<div class="group-body">`;
        if (!gs.length) html += `<div style="padding:12px 16px;font-size:13px;color:#999">Aucun site dans ce groupe.</div>`;
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
            <span class="group-name" style="color:#777">Sans groupe</span>
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
      html = `<div class="empty">Aucun site enregistré.<br>Commencez par créer un groupe, puis ajoutez des sites.</div>`;
    }
  }

  list.innerHTML = html;
}

// ── Ligne d'un site ───────────────────────────────────────────────
function rowHTML(s, q, grpLabel) {
  const techBadges = (s.technologies || []).map(tid => {
    const t = TECHS.find(x => x.id === tid);
    return t
      ? `<span class="tech-badge"><img src="${SI}/${t.slug}" width="12" height="12" alt="" onerror="this.style.display='none'">${esc(t.label)}</span>`
      : '';
  }).join('');

  return `
    <div class="site-row">
      <div class="site-info">
        <div class="site-name">${hl(s.name, q)}</div>
        <div class="site-meta">
          ${s.url        ? `<a class="icon-link" href="${esc(s.url)}" target="_blank" title="${esc(s.url)}">${SVG_EXT}</a>` : ''}
          ${s.gitlab_url ? `<a class="icon-link" href="${esc(s.gitlab_url)}" target="_blank" title="GitLab">${SVG_GL}</a>` : ''}
          ${s.server     ? `<span class="tag">${hl(s.server, q)}</span>` : ''}
          ${grpLabel     ? `<span class="tag" style="color:#999">${esc(grpLabel)}</span>` : ''}
          ${techBadges}
          ${s.notes      ? `<span>${hl(s.notes, q)}</span>` : ''}
        </div>
      </div>
      <div class="row-actions">
        <button class="icon-btn" onclick="openSiteModal('${s.id}')" title="Modifier">&#9998;</button>
        <button class="icon-btn del" onclick="deleteGroup_site('${s.id}')" title="Supprimer">&#10005;</button>
      </div>
    </div>`;
}

function toggleGroup(id) {
  collapsed[id] = !collapsed[id];
  saveCollapsed();
  render();
}
