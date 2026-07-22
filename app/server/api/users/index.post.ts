import type { UserProfile } from '~/server/utils/types'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, USER_ROLES } from '~/server/db/schema'
import { hashPassword } from '~/server/utils/password'
import { USER_COLS } from '~/server/api/users/index.get'

interface UserCreate {
  email      : string
  password   : string
  first_name?: string
  last_name ?: string
  role      ?: string
  agency    ?: string | null
  job_title ?: string | null
}

// Création d'un compte — RÉSERVÉ AUX SYSADMINS. Mot de passe défini par l'admin,
// changement forcé au 1er login (must_change_password = true).
export default defineEventHandler(async (event): Promise<UserProfile> => {
  await requireRole(event, ['sysadmin'])
  const body = await readBody<UserCreate>(event)

  const email = validateOptionalEmail(body.email, 'Email')?.toLowerCase()
  if (!email) throw createError({ statusCode: 400, message: 'Email requis' })
  if (!body.password || body.password.length < 10) {
    throw createError({ statusCode: 400, message: 'Le mot de passe doit faire au moins 10 caractères' })
  }
  const role = body.role ?? 'viewer'
  if (!(USER_ROLES as readonly string[]).includes(role)) {
    throw createError({ statusCode: 400, message: 'Rôle invalide' })
  }

  const db = useDb()
  const [dup] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1)
  if (dup) throw createError({ statusCode: 409, message: 'Un compte utilise déjà cet email' })

  const [row] = await db.insert(users).values({
    email,
    password_hash       : await hashPassword(body.password),
    first_name          : clampString(body.first_name, 100) ?? '',
    last_name           : clampString(body.last_name, 100) ?? '',
    role                : role as (typeof USER_ROLES)[number],
    agency              : clampString(body.agency, 200),
    job_title           : clampString(body.job_title, 200),
    is_active           : true,
    must_change_password: true,
  }).returning(USER_COLS)

  if (!row) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return row
})
