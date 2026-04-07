// ── Auth ──────────────────────────────────────────────────────────
const SESSION_KEY='eclolink_session';

function getSession(){try{return JSON.parse(localStorage.getItem(SESSION_KEY));}catch{return null;}}
function saveSession(s){localStorage.setItem(SESSION_KEY,JSON.stringify(s));}
function clearSession(){localStorage.removeItem(SESSION_KEY);}

function getSBHeaders(){
  const s=getSession();
  return{
    'apikey':SUPABASE_KEY,
    'Authorization':'Bearer '+(s?s.access_token:SUPABASE_KEY),
    'Content-Type':'application/json',
    'Prefer':'return=representation'
  };
}

async function tryRefreshToken(){
  const s=getSession();
  if(!s?.refresh_token)return false;
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`,{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({refresh_token:s.refresh_token})
    });
    if(!r.ok)return false;
    const d=await r.json();
    saveSession({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()/1000+d.expires_in});
    return true;
  }catch{return false;}
}

async function initAuth(){
  const s=getSession();
  if(s){
    if(s.expires_at&&Date.now()/1000>s.expires_at-60){
      const ok=await tryRefreshToken();
      if(!ok){clearSession();showLogin();return;}
    }
    showApp();return;
  }
  showLogin();
}

function showLogin(){
  document.getElementById('login-screen').style.display='flex';
  document.getElementById('app').style.display='none';
}

async function submitLogin(){
  const email=document.getElementById('login-email').value.trim();
  const password=document.getElementById('login-password').value;
  const err=document.getElementById('login-error');
  const btn=document.getElementById('login-btn');
  err.style.display='none';
  btn.disabled=true;btn.innerHTML='<span class="spinner" style="border-color:var(--btn-primary-color);border-top-color:transparent"></span>Connexion...';
  try{
    const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{
      method:'POST',
      headers:{'apikey':SUPABASE_KEY,'Content-Type':'application/json'},
      body:JSON.stringify({email,password})
    });
    if(!r.ok)throw new Error();
    const d=await r.json();
    saveSession({access_token:d.access_token,refresh_token:d.refresh_token,expires_at:Date.now()/1000+d.expires_in});
    showApp();
  }catch{
    err.style.display='block';
    document.getElementById('login-password').value='';
    document.getElementById('login-password').focus();
  }finally{
    btn.disabled=false;btn.textContent='Accéder';
  }
}

function showApp(){
  document.getElementById('login-screen').style.display='none';
  document.getElementById('app').style.display='block';
  load();
}

function logout(){
  clearSession();
  showLogin();
}

// ── Thème ─────────────────────────────────────────────────────────
const THEME_KEY='eclolink_theme';

function initTheme(){
  const saved=localStorage.getItem(THEME_KEY);
  const prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;
  applyTheme(saved||(prefersDark?'dark':'light'));
}

function applyTheme(theme){
  document.documentElement.setAttribute('data-theme',theme);
  localStorage.setItem(THEME_KEY,theme);
  const btn=document.getElementById('theme-btn');
  if(btn)btn.textContent=theme==='dark'?'Thème clair':'Thème sombre';
}

function toggleTheme(){
  const current=document.documentElement.getAttribute('data-theme');
  applyTheme(current==='dark'?'light':'dark');
}

// ── Technologies ───────────────────────────────────────────────────
const TECHS=[
  {id:'wordpress',   label:'WordPress',   slug:'wordpress'},
  {id:'divi',        label:'Divi',        slug:'divi'},
  {id:'elementor',   label:'Elementor',   slug:'elementor'},
  {id:'wpbakery',    label:'WP Bakery',   slug:'wpbakery'},
  {id:'prestashop',  label:'PrestaShop',  slug:'prestashop'},
  {id:'woocommerce', label:'WooCommerce', slug:'woocommerce'},
];
const SI='https://cdn.simpleicons.org';
const SVG_EXT=`<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;
const SVG_GL=`<img src="${SI}/gitlab/FC6D26" width="12" height="12" alt="GitLab" style="display:block">`;

// ── Init ───────────────────────────────────────────────────────────
initTheme();
initAuth();

async function handleResponse(r){
  if(r.status===401){clearSession();showLogin();throw new Error('Session expirée');}
  if(!r.ok)throw new Error(await r.text());
}
async function sbGet(table){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`,{headers:getSBHeaders()});
  await handleResponse(r);return r.json();
}
async function sbInsert(table,obj){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}`,{method:'POST',headers:getSBHeaders(),body:JSON.stringify(obj)});
  await handleResponse(r);return r.json();
}
async function sbUpdate(table,id,obj){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'PATCH',headers:getSBHeaders(),body:JSON.stringify(obj)});
  await handleResponse(r);
}
async function sbDelete(table,id){
  const r=await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`,{method:'DELETE',headers:getSBHeaders()});
  await handleResponse(r);
}

// ── State ─────────────────────────────────────────────────────────
let groups=[],sites=[],collapsed={};
let modalMode=null,editId=null,preGroupId=null,pendingDelete=null;

const SK_C='eclolink_collapsed';
function loadCollapsed(){try{const r=localStorage.getItem(SK_C);if(r)collapsed=JSON.parse(r);}catch(e){}}
function saveCollapsed(){try{localStorage.setItem(SK_C,JSON.stringify(collapsed));}catch(e){}}

async function load(showToast){
  document.getElementById('list').innerHTML='<div style="padding:2rem;text-align:center;color:#777;font-size:14px">Chargement...</div>';
  loadCollapsed();
  try{
    [groups,sites]=await Promise.all([sbGet('eclolink_groups'),sbGet('eclolink_sites')]);
    // normaliser group_id → groupId
    sites=sites.map(s=>({...s,groupId:s.group_id,gitlab_url:s.gitlab_url||'',technologies:tryParseJSON(s.technologies)}));
    render();
    if(showToast)toast('Données actualisées');
  }catch(e){
    document.getElementById('list').innerHTML=`<div style="padding:2rem;text-align:center;color:#a32d2d;font-size:13px">Erreur de connexion à Supabase.<br>${esc(e.message)}</div>`;
  }
}

// ── Helpers ───────────────────────────────────────────────────────
function esc(t){return String(t||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}
function hl(text,q){
  if(!q)return esc(text);
  const re=new RegExp('('+q.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+')','gi');
  return esc(text).replace(re,'<mark>$1</mark>');
}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2)}
function tryParseJSON(str){try{const v=JSON.parse(str);return Array.isArray(v)?v:[];}catch{return [];}}
function toast(msg){
  const el=document.getElementById('toast');
  el.textContent=msg;el.style.opacity='1';
  clearTimeout(el._t);el._t=setTimeout(()=>el.style.opacity='0',2000);
}

// ── Render ────────────────────────────────────────────────────────
function render(){
  const q=(document.getElementById('search').value||'').trim().toLowerCase();
  const list=document.getElementById('list');
  let html='';
  const filtered=sites.filter(s=>{
    if(!q)return true;
    return(s.name||'').toLowerCase().includes(q)||(s.url||'').toLowerCase().includes(q)||(s.server||'').toLowerCase().includes(q)||(s.notes||'').toLowerCase().includes(q);
  });
  if(q){
    if(!filtered.length){html=`<div class="no-result">Aucun résultat pour "${esc(q)}"</div>`;}
    else{
      html+=`<div class="group-card"><div class="group-body">`;
      filtered.forEach(s=>{const g=groups.find(g=>g.id===s.groupId);html+=rowHTML(s,q,g?g.name:'');});
      html+=`</div></div>`;
    }
  } else {
    const ungrouped=sites.filter(s=>!s.groupId||!groups.find(g=>g.id===s.groupId));
    groups.forEach(g=>{
      const gs=sites.filter(s=>s.groupId===g.id);
      const open=!collapsed[g.id];
      html+=`<div class="group-card">
        <div class="group-head" onclick="toggleGroup('${g.id}')">
          <span class="chevron ${open?'open':''}">&#9654;</span>
          <span class="group-name">${esc(g.name)}</span>
          <span class="group-count">${gs.length}</span>
          <div class="group-actions" onclick="event.stopPropagation()">
            <button class="icon-btn" onclick="openGroupModal('${g.id}')" title="Renommer">&#9998;</button>
            <button class="icon-btn del" onclick="deleteGroup('${g.id}')" title="Supprimer">&#10005;</button>
          </div>
        </div>`;
      if(open){
        html+=`<div class="group-body">`;
        if(!gs.length)html+=`<div style="padding:12px 16px;font-size:13px;color:#999">Aucun site dans ce groupe.</div>`;
        gs.forEach(s=>{html+=rowHTML(s,q);});
        html+=`<div class="add-site" onclick="openSiteModal(null,'${g.id}')">&#43; Ajouter un site</div></div>`;
      }
      html+=`</div>`;
    });
    if(ungrouped.length){
      const open=!collapsed['__none__'];
      html+=`<div class="group-card">
        <div class="group-head" onclick="toggleGroup('__none__')">
          <span class="chevron ${open?'open':''}">&#9654;</span>
          <span class="group-name" style="color:#777">Sans groupe</span>
          <span class="group-count">${ungrouped.length}</span>
        </div>`;
      if(open){html+=`<div class="group-body">`;ungrouped.forEach(s=>{html+=rowHTML(s,q);});html+=`</div>`;}
      html+=`</div>`;
    }
    if(!groups.length&&!sites.length){
      html=`<div class="empty">Aucun site enregistré.<br>Commencez par créer un groupe, puis ajoutez des sites.</div>`;
    }
  }
  list.innerHTML=html;
}

function rowHTML(s,q,grpLabel){
  const techBadges=(s.technologies||[]).map(tid=>{
    const t=TECHS.find(x=>x.id===tid);
    return t?`<span class="tech-badge"><img src="${SI}/${t.slug}" width="12" height="12" alt="" onerror="this.style.display='none'">${esc(t.label)}</span>`:'';
  }).join('');
  return `<div class="site-row">
    <div class="site-info">
      <div class="site-name">${hl(s.name,q)}</div>
      <div class="site-meta">
        ${s.url?`<a class="icon-link" href="${esc(s.url)}" target="_blank" title="${esc(s.url)}">${SVG_EXT}</a>`:''}
        ${s.gitlab_url?`<a class="icon-link" href="${esc(s.gitlab_url)}" target="_blank" title="GitLab">${SVG_GL}</a>`:''}
        ${s.server?`<span class="tag">${hl(s.server,q)}</span>`:''}
        ${grpLabel?`<span class="tag" style="color:#999">${esc(grpLabel)}</span>`:''}
        ${techBadges}
        ${s.notes?`<span>${hl(s.notes,q)}</span>`:''}
      </div>
    </div>
    <div class="row-actions">
      <button class="icon-btn" onclick="openSiteModal('${s.id}')" title="Modifier">&#9998;</button>
      <button class="icon-btn del" onclick="deleteGroup_site('${s.id}')" title="Supprimer">&#10005;</button>
    </div>
  </div>`;
}

function toggleGroup(id){collapsed[id]=!collapsed[id];saveCollapsed();render();}

// ── Modales ───────────────────────────────────────────────────────
function openOverlay(id){
  document.getElementById(id).classList.add('open');
  document.body.classList.add('modal-open');
}
function closeModal(){
  document.getElementById('modal-wrap').classList.remove('open');
  if(!document.getElementById('confirm-wrap').classList.contains('open'))document.body.classList.remove('modal-open');
  modalMode=null;editId=null;preGroupId=null;
}
function closeConfirm(){
  document.getElementById('confirm-wrap').classList.remove('open');
  if(!document.getElementById('modal-wrap').classList.contains('open'))document.body.classList.remove('modal-open');
  pendingDelete=null;
}

function openGroupModal(id){
  modalMode='group';editId=id||null;
  const g=id?groups.find(g=>g.id===id):null;
  document.getElementById('modal-title').textContent=id?'Renommer le groupe':'Nouveau groupe';
  document.getElementById('modal-body').innerHTML=`<div class="field"><label>Nom du groupe</label><input id="f-name" type="text" value="${esc(g?g.name:'')}" placeholder="Ex : Hôtels, E-commerce..."></div>`;
  openOverlay('modal-wrap');
  setTimeout(()=>{const el=document.getElementById('f-name');if(el)el.focus();},60);
}

function openSiteModal(id,pgid){
  modalMode='site';editId=id||null;preGroupId=pgid||null;
  const s=id?sites.find(s=>s.id===id):null;
  document.getElementById('modal-title').textContent=id?'Modifier le site':'Nouveau site';
  const sel=s?s.groupId:pgid;
  const opts=groups.map(g=>`<option value="${g.id}"${sel===g.id?' selected':''}>${esc(g.name)}</option>`).join('');
  document.getElementById('modal-body').innerHTML=`
    <div class="field"><label>Nom du site *</label><input id="f-name" type="text" value="${esc(s?s.name:'')}" placeholder="Ex : Hôtel Mercure Dijon"></div>
    <div class="field"><label>URL</label><input id="f-url" type="text" value="${esc(s?s.url:'')}" placeholder="https://..."></div>
    <div class="field"><label>GitLab</label><input id="f-gitlab" type="text" value="${esc(s?s.gitlab_url||'':'')}" placeholder="https://gitlab.com/..."></div>
    <div class="field"><label>Serveur / hébergeur</label><input id="f-server" type="text" value="${esc(s?s.server:'')}" placeholder="Ex : OVH-VPS-123, Infomaniak..."></div>
    <div class="field"><label>Groupe</label><select id="f-group"><option value="">— Sans groupe —</option>${opts}</select></div>
    <div class="field"><label>Technologies</label>
      <div class="tech-select" id="tech-select">
        <div class="tech-select-box" id="tech-box" onclick="toggleTechDropdown()">
          <span class="tech-placeholder">Sélectionner...</span>
        </div>
        <div class="tech-dropdown" id="tech-dropdown">
          ${TECHS.map(t=>`<label class="tech-option"><input type="checkbox" value="${t.id}" onchange="updateTechBox()"><img src="${SI}/${t.slug}" width="15" height="15" alt="" onerror="this.style.display='none'">${esc(t.label)}</label>`).join('')}
        </div>
      </div>
    </div>
    <div class="field"><label>Notes</label><textarea id="f-notes" placeholder="Infos utiles, WP-Admin, FTP...">${esc(s?s.notes:'')}</textarea></div>`;
  openOverlay('modal-wrap');
  setTimeout(()=>{
    const el=document.getElementById('f-name');if(el)el.focus();
    if(s&&s.technologies&&s.technologies.length){
      s.technologies.forEach(tid=>{
        const cb=document.querySelector(`#tech-dropdown input[value="${tid}"]`);
        if(cb)cb.checked=true;
      });
      updateTechBox();
    }
  },60);
}

async function saveModal(){
  const btn=document.getElementById('save-btn');
  btn.disabled=true;btn.innerHTML='<span class="spinner"></span>Enregistrement...';
  try{
    if(modalMode==='group'){
      const name=(document.getElementById('f-name').value||'').trim();
      if(!name)return;
      if(editId){
        await sbUpdate('eclolink_groups',editId,{name});
        groups=groups.map(g=>g.id===editId?{...g,name}:g);
      } else {
        const id=uid();
        await sbInsert('eclolink_groups',{id,name});
        groups.push({id,name});
      }
    } else if(modalMode==='site'){
      const name=(document.getElementById('f-name').value||'').trim();
      if(!name)return;
      const techs=getSelectedTechs();
      const obj={
        name,
        url:(document.getElementById('f-url').value||'').trim(),
        gitlab_url:(document.getElementById('f-gitlab').value||'').trim(),
        server:(document.getElementById('f-server').value||'').trim(),
        group_id:document.getElementById('f-group').value||null,
        technologies:JSON.stringify(techs),
        notes:(document.getElementById('f-notes').value||'').trim()
      };
      if(editId){
        await sbUpdate('eclolink_sites',editId,obj);
        sites=sites.map(s=>s.id===editId?{...s,...obj,groupId:obj.group_id,technologies:techs}:s);
      } else {
        const id=uid();
        await sbInsert('eclolink_sites',{id,...obj});
        sites.push({id,...obj,groupId:obj.group_id,technologies:techs});
      }
    }
    closeModal();render();toast('Enregistré ✓');
  }catch(e){toast('Erreur : '+e.message);}
  finally{btn.disabled=false;btn.textContent='Enregistrer';}
}

// ── Suppression ────────────────────────────────────────────────────
function deleteGroup(id){
  pendingDelete={type:'group',id};
  document.getElementById('confirm-msg').textContent='Supprimer ce groupe ? Les sites seront déplacés dans "Sans groupe".';
  openOverlay('confirm-wrap');
}
function deleteGroup_site(id){
  pendingDelete={type:'site',id};
  document.getElementById('confirm-msg').textContent='Supprimer ce site définitivement ?';
  openOverlay('confirm-wrap');
}

async function executeDelete(){
  if(!pendingDelete)return;
  const {type,id}=pendingDelete;
  closeConfirm();
  try{
    if(type==='group'){
      await sbDelete('eclolink_groups',id);
      // libérer les sites du groupe
      const orphans=sites.filter(s=>s.groupId===id);
      await Promise.all(orphans.map(s=>sbUpdate('eclolink_sites',s.id,{group_id:null})));
      groups=groups.filter(g=>g.id!==id);
      sites=sites.map(s=>s.groupId===id?{...s,groupId:null,group_id:null}:s);
      toast('Groupe supprimé');
    } else {
      await sbDelete('eclolink_sites',id);
      sites=sites.filter(s=>s.id!==id);
      toast('Site supprimé');
    }
    render();
  }catch(e){toast('Erreur : '+e.message);}
}

// ── Tech select ───────────────────────────────────────────────────
function toggleTechDropdown(){
  document.getElementById('tech-dropdown')?.classList.toggle('open');
}
function updateTechBox(){
  const checked=Array.from(document.querySelectorAll('#tech-dropdown input:checked'));
  const box=document.getElementById('tech-box');
  if(!box)return;
  if(!checked.length){
    box.innerHTML='<span class="tech-placeholder">Sélectionner...</span>';
  }else{
    box.innerHTML=checked.map(cb=>{
      const t=TECHS.find(x=>x.id===cb.value);
      return t?`<span class="tech-badge"><img src="${SI}/${t.slug}" width="12" height="12" alt="" onerror="this.style.display='none'">${esc(t.label)}</span>`:'';
    }).join('');
  }
}
function getSelectedTechs(){
  return Array.from(document.querySelectorAll('#tech-dropdown input:checked')).map(cb=>cb.value);
}
document.addEventListener('click',e=>{
  const sel=document.getElementById('tech-select');
  if(sel&&!sel.contains(e.target))document.getElementById('tech-dropdown')?.classList.remove('open');
});

// ── Clavier ────────────────────────────────────────────────────────
document.addEventListener('keydown',e=>{
  const isConfirm=document.getElementById('confirm-wrap').classList.contains('open');
  const isModal=document.getElementById('modal-wrap').classList.contains('open');
  if(isConfirm){
    if(e.key==='Escape'){e.preventDefault();closeConfirm();}
    if(e.key==='Enter'){e.preventDefault();executeDelete();}
    return;
  }
  if(isModal){
    if(e.key==='Escape'){e.preventDefault();closeModal();}
    if(e.key==='Enter'&&e.target.tagName!=='TEXTAREA'){e.preventDefault();saveModal();}
  }
});
