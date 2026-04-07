// ── Session ───────────────────────────────────────────────────────
const SESSION_KEY = 'eclolink_session';

function getSession()  { try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch { return null; } }
function saveSession(s){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }

function getSBHeaders() {
  const s = getSession();
  return {
    'apikey'       : SUPABASE_KEY,
    'Authorization': 'Bearer ' + (s ? s.access_token : SUPABASE_KEY),
    'Content-Type' : 'application/json',
    'Prefer'       : 'return=representation'
  };
}

// ── Token refresh ─────────────────────────────────────────────────
async function tryRefreshToken() {
  const s = getSession();
  if (!s?.refresh_token) return false;
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
      method : 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body   : JSON.stringify({ refresh_token: s.refresh_token })
    });
    if (!r.ok) return false;
    const d = await r.json();
    saveSession({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() / 1000 + d.expires_in });
    return true;
  } catch { return false; }
}

// ── Auth flow ─────────────────────────────────────────────────────
async function initAuth() {
  const s = getSession();
  if (s) {
    if (s.expires_at && Date.now() / 1000 > s.expires_at - 60) {
      const ok = await tryRefreshToken();
      if (!ok) { clearSession(); showLogin(); return; }
    }
    showApp(); return;
  }
  showLogin();
}

function showLogin() {
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('app').style.display = 'none';
}

async function submitLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const err      = document.getElementById('login-error');
  const btn      = document.getElementById('login-btn');
  err.style.display = 'none';
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner" style="border-color:var(--btn-primary-color);border-top-color:transparent"></span>Connexion...';
  try {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method : 'POST',
      headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
      body   : JSON.stringify({ email, password })
    });
    if (!r.ok) throw new Error();
    const d = await r.json();
    saveSession({ access_token: d.access_token, refresh_token: d.refresh_token, expires_at: Date.now() / 1000 + d.expires_in });
    showApp();
  } catch {
    err.style.display = 'block';
    document.getElementById('login-password').value = '';
    document.getElementById('login-password').focus();
  } finally {
    btn.disabled = false;
    btn.textContent = 'Accéder';
  }
}

function showApp() {
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').style.display = 'block';
  load();
}

function logout() {
  clearSession();
  showLogin();
}
