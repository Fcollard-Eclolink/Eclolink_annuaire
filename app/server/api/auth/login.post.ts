import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { verifyPassword } from '~/server/utils/password'
import { createSession } from '~/server/utils/session'

interface LoginBody {
  email   : string
  password: string
}

// Hash factice (ne correspond à aucun compte) : vérifié quand l'email n'existe
// pas, pour égaliser le temps de réponse et empêcher l'énumération par timing.
const DUMMY_HASH = `scrypt$${'0'.repeat(32)}$${'0'.repeat(128)}`

export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const { email, password } = await readBody<LoginBody>(event)

  if (!email || !password) {
    throw createError({ statusCode: 400, message: 'Email et mot de passe requis' })
  }

  const normalized = email.trim().toLowerCase()

  // Double rate-limit : par IP (anti-flood) ET par compte (anti brute-force ciblé,
  // qui reste efficace même si X-Forwarded-For est falsifié).
  const ip = getClientIp(event)
  checkRateLimit({ key: `login:ip:${ip}`,           limit: 15 })
  checkRateLimit({ key: `login:acct:${normalized}`, limit: 8  })

  const db   = useDb()
  const rows = await db.select().from(users).where(eq(users.email, normalized)).limit(1)
  const user = rows[0]

  // Toujours exécuter le scrypt (hash factice si compte inexistant) → temps constant.
  // Message générique dans tous les cas (inexistant / mauvais mdp / désactivé).
  const passwordOk = await verifyPassword(password, user?.password_hash ?? DUMMY_HASH)
  if (!user || !user.is_active || !passwordOk) {
    throw createError({ statusCode: 401, message: 'Email ou mot de passe incorrect' })
  }

  await createSession(event, user.id)
  await db.update(users).set({ last_login_at: new Date().toISOString() }).where(eq(users.id, user.id))

  clearRateLimit(`login:ip:${ip}`)
  clearRateLimit(`login:acct:${normalized}`)

  return { ok: true }
})
