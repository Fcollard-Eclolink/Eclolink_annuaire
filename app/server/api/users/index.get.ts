import type { UserProfile } from '~/server/utils/types'
import { asc, eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, USER_ROLES } from '~/server/db/schema'

// Colonnes publiques d'un utilisateur — password_hash n'est JAMAIS exposé.
// user_id = users.id (compat contrat historique UserProfile).
export const USER_COLS = {
  user_id   : users.id,
  email     : users.email,
  first_name: users.first_name,
  last_name : users.last_name,
  role      : users.role,
  agency    : users.agency,
  job_title : users.job_title,
  is_active : users.is_active,
  created_at: users.created_at,
}

export default defineEventHandler(async (event): Promise<UserProfile[]> => {
  await requireUser(event)
  const db        = useDb()
  const roleParam = getQuery(event).role

  const cond = (typeof roleParam === 'string' && (USER_ROLES as readonly string[]).includes(roleParam))
    ? eq(users.role, roleParam as (typeof USER_ROLES)[number])
    : undefined

  return db.select(USER_COLS).from(users).where(cond).orderBy(asc(users.last_name), asc(users.first_name))
})
