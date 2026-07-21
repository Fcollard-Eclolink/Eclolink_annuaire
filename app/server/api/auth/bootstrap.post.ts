import { count } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users } from '~/server/db/schema'
import { hashPassword } from '~/server/utils/password'
import { createSession } from '~/server/utils/session'

interface BootstrapBody {
  email      : string
  password   : string
  first_name?: string
  last_name ?: string
}

// Amorçage du 1er compte sysadmin. Ne fonctionne QUE si la table users est vide
// (auto-désactivation une fois le 1er compte créé) → sûr à laisser en place.
export default defineEventHandler(async (event): Promise<{ ok: true }> => {
  const db = useDb()
  const [stats] = await db.select({ n: count() }).from(users)
  if ((stats?.n ?? 0) > 0) {
    throw createError({ statusCode: 403, message: 'Amorçage déjà effectué' })
  }

  const ip = getClientIp(event)
  checkRateLimit({ key: `bootstrap:${ip}`, limit: 5, windowMs: 15 * 60 * 1000 })

  const body  = await readBody<BootstrapBody>(event)
  const email = validateOptionalEmail(body.email, 'Email')?.toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Email requis' })
  if (!body.password || body.password.length < 10) {
    throw createError({ statusCode: 400, message: 'Le mot de passe doit faire au moins 10 caractères' })
  }

  const [row] = await db.insert(users).values({
    email,
    password_hash       : await hashPassword(body.password),
    first_name          : clampString(body.first_name, 100) ?? '',
    last_name           : clampString(body.last_name, 100) ?? '',
    role                : 'sysadmin',
    is_active           : true,
    must_change_password: false,
  }).returning({ id: users.id })

  if (row) await createSession(event, row.id)
  return { ok: true }
})
