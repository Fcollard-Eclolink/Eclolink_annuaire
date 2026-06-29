interface LoginBody {
  email   : string
  password: string
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readBody<LoginBody>(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  // Rate limit : max 5 tentatives par IP sur 15 min. Throw 429 si dépassé.
  const ip = getClientIp(event)
  checkRateLimit({
    key     : `login:${ip}`,
    limit   : 5,
    windowMs: 15 * 60 * 1000,
  })

  const { supabaseUrl, supabaseKey } = useRuntimeConfig()

  const res = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=password`,
    {
      method  : 'POST',
      headers : { apikey: supabaseKey, 'Content-Type': 'application/json' },
      body    : JSON.stringify({ email, password }),
    },
  )

  if (!res.ok) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }

  const data = (await res.json()) as SupabaseTokenData
  setTokenCookies(event, data)

  // Login OK → on remet le compteur à zéro pour cette IP
  clearRateLimit(`login:${ip}`)

  return { ok: true }
})
