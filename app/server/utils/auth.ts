import type { H3Event } from 'h3'
import type { User } from '~/server/db/schema'
import type { AuthUser } from '~/server/utils/types'
import { USER_ROLES } from '~/server/db/schema'
import { resolveSessionUser } from '~/server/utils/session'

export type Role = typeof USER_ROLES[number]

/** Rôles autorisés à écrire (toutes mutations sauf gestion des comptes). */
export const WRITE_ROLES: Role[] = ['sysadmin', 'dev', 'pm', 'crea']

/** Exige une session valide — throw 401 sinon. */
export async function requireUser(event: H3Event): Promise<User> {
  const user = await resolveSessionUser(event)
  if (!user) throw createError({ statusCode: 401, message: 'Non authentifié' })
  return user
}

/** Exige une session valide ET un rôle autorisé — throw 401/403 sinon. */
export async function requireRole(event: H3Event, roles: Role[]): Promise<User> {
  const user = await requireUser(event)
  if (!roles.includes(user.role)) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }
  return user
}

/** Projection publique d'un utilisateur (contrat /api/auth/me — snake_case). */
export function toAuthUser(u: User): AuthUser {
  return {
    id                  : u.id,
    email               : u.email,
    first_name          : u.first_name,
    last_name           : u.last_name,
    role                : u.role,
    agency              : u.agency,
    job_title           : u.job_title,
    must_change_password: u.must_change_password,
  }
}
