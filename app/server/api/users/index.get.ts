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
  const actor     = await requireUser(event)
  const db        = useDb()
  const roleParam = getQuery(event).role

  const cond = (typeof roleParam === 'string' && (USER_ROLES as readonly string[]).includes(roleParam))
    ? eq(users.role, roleParam as (typeof USER_ROLES)[number])
    : undefined

  const rows = await db.select(USER_COLS).from(users).where(cond)
    .orderBy(asc(users.last_name), asc(users.first_name))

  // Les emails ne sont utiles qu'à la gestion des comptes (sysadmin). Pour les
  // autres rôles (dropdowns dev/CP), on ne divulgue pas l'email.
  if (actor.role !== 'sysadmin') return rows.map((r): UserProfile => ({ ...r, email: '' }))
  return rows
})
