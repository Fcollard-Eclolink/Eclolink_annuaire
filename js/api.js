// ── Supabase REST helpers ─────────────────────────────────────────
async function handleResponse(r) {
  if (r.status === 401) { clearSession(); showLogin(); throw new Error('Session expirée'); }
  if (!r.ok) throw new Error(await r.text());
}

async function sbGet(table) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*`, { headers: getSBHeaders() });
  await handleResponse(r);
  return r.json();
}

async function sbInsert(table, obj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method : 'POST',
    headers: getSBHeaders(),
    body   : JSON.stringify(obj)
  });
  await handleResponse(r);
  return r.json();
}

async function sbUpdate(table, id, obj) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    headers: getSBHeaders(),
    body   : JSON.stringify(obj)
  });
  await handleResponse(r);
}

async function sbDelete(table, id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?id=eq.${encodeURIComponent(id)}`, {
    method : 'DELETE',
    headers: getSBHeaders()
  });
  await handleResponse(r);
}
