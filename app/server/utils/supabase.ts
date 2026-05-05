import type { H3Event } from 'h3'

const COOKIE_ACCESS  = 'sb_access'
const COOKIE_REFRESH = 'sb_refresh'

const cookieOpts = (maxAge: number) => ({
  httpOnly : true,
  secure   : process.env.NODE_ENV === 'production',
  sameSite : 'lax' as const,
  path     : '/',
  maxAge,
})

// ── Lecture des cookies ────────────────────────────────────────────
export function getAccessToken(event: H3Event) {
  return getCookie(event, COOKIE_ACCESS) ?? null
}

// ── Persistance des tokens ─────────────────────────────────────────
export function setTokenCookies(event: H3Event, data: {
  access_token: string
  refresh_token: string
  expires_in: number
}) {
  setCookie(event, COOKIE_ACCESS,  data.access_token,  cookieOpts(data.expires_in))
  setCookie(event, COOKIE_REFRESH, data.refresh_token, cookieOpts(60 * 60 * 24 * 30))
}

export function clearTokenCookies(event: H3Event) {
  deleteCookie(event, COOKIE_ACCESS,  { path: '/' })
  deleteCookie(event, COOKIE_REFRESH, { path: '/' })
}

// ── Refresh du token ───────────────────────────────────────────────
async function refreshAccessToken(event: H3Event): Promise<string | null> {
  const refreshToken = getCookie(event, COOKIE_REFRESH)
  if (!refreshToken) return null

  const config = useRuntimeConfig()
  const res = await fetch(
    `${config.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
    {
      method  : 'POST',
      headers : { apikey: config.supabaseKey, 'Content-Type': 'application/json' },
      body    : JSON.stringify({ refresh_token: refreshToken }),
    },
  )

  if (!res.ok) {
    clearTokenCookies(event)
    return null
  }

  const data = await res.json()
  setTokenCookies(event, data)
  return data.access_token as string
}

// ── Requête authentifiée vers Supabase (avec retry si 401) ────────
export async function sbFetch(
  event   : H3Event,
  path    : string,
  options : RequestInit = {},
): Promise<Response> {
  const config = useRuntimeConfig()
  let token = getAccessToken(event)
  if (!token) throw createError({ statusCode: 401, message: 'Non authentifié' })

  const makeReq = (t: string) =>
    fetch(`${config.supabaseUrl}${path}`, {
      ...options,
      headers: {
        apikey        : config.supabaseKey,
        Authorization : `Bearer ${t}`,
        'Content-Type': 'application/json',
        Prefer        : 'return=representation',
        ...(options.headers ?? {}),
      },
    })

  let res = await makeReq(token)

  if (res.status === 401) {
    const newToken = await refreshAccessToken(event)
    if (!newToken) throw createError({ statusCode: 401, message: 'Session expirée' })
    res = await makeReq(newToken)
  }

  if (!res.ok) {
    const text = await res.text()
    throw createError({ statusCode: res.status, message: text })
  }

  return res
}
