// ── État global de l'application ──────────────────────────────────
let groups       = [];
let sites        = [];
let collapsed    = {};
let modalMode    = null;
let editId       = null;
let preGroupId   = null;
let pendingDelete= null;

// ── Persistance de l'état des groupes ouverts/fermés ─────────────
const SK_C = 'eclolink_collapsed';

function loadCollapsed() {
  try { const r = localStorage.getItem(SK_C); if (r) collapsed = JSON.parse(r); } catch(e) {}
}
function saveCollapsed() {
  try { localStorage.setItem(SK_C, JSON.stringify(collapsed)); } catch(e) {}
}

// ── Utilitaires généraux ──────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function tryParseJSON(str) {
  try { const v = JSON.parse(str); return Array.isArray(v) ? v : []; } catch { return []; }
}

function esc(t) {
  return String(t || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function hl(text, q) {
  if (!q) return esc(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return esc(text).replace(re, '<mark>$1</mark>');
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.style.opacity = '1';
  clearTimeout(el._t);
  el._t = setTimeout(() => el.style.opacity = '0', 2000);
}
