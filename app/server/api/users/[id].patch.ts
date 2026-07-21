import type { UserProfile } from '~/server/utils/types'
import { eq } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { users, USER_ROLES } from '~/server/db/schema'
import { revokeAllUserSessions } from '~/server/utils/session'
import { USER_COLS } from '~/server/api/users/index.get'

interface UserProfilePatch {
  first_name?: string
  last_name ?: string
  role      ?: string
  agency    ?: string | null
  job_title ?: string | null
  is_active ?: boolean
}

// Édition de profil :
//  - tout utilisateur peut modifier SON propre profil (champs non sensibles) ;
//  - `role` / `is_active` et l'édition d'un AUTRE compte sont réservés aux sysadmins.
export default defineEventHandler(async (event): Promise<UserProfile> => {
  const actor = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const isSelf  = id === actor.id
  const isAdmin = actor.role === 'sysadmin'
  if (!isSelf && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  const body = await readBody<UserProfilePatch>(event)

  // Champs privilégiés → sysadmin uniquement.
  if ((body.role !== undefined || body.is_active !== undefined) && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Seul un sysadmin peut modifier le rôle ou le statut' })
  }
  // Garde anti-verrouillage (sysadmin agissant sur son propre compte).
  if (isSelf && body.role !== undefined && body.role !== 'sysadmin') {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas retirer votre propre rôle sysadmin' })
  }
  if (isSelf && body.is_active === false) {
    throw createError({ statusCode: 400, message: 'Vous ne pouvez pas désactiver votre propre compte' })
  }

  const db = useDb()
  const patch: Partial<typeof users.$inferInsert> = {}
  if (body.first_name !== undefined) patch.first_name = requireString(body.first_name, 'Prénom', 100)
  if (body.last_name  !== undefined) patch.last_name  = requireString(body.last_name,  'Nom',    100)
  if (body.agency     !== undefined) patch.agency     = clampString(body.agency, 200)
  if (body.job_title  !== undefined) patch.job_title  = clampString(body.job_title, 200)
  if (body.is_active  !== undefined) patch.is_active  = !!body.is_active
  if (body.role       !== undefined) {
    if (!(USER_ROLES as readonly string[]).includes(body.role)) {
      throw createError({ statusCode: 400, message: 'Rôle invalide' })
    }
    patch.role = body.role as (typeof USER_ROLES)[number]
  }

  if (Object.keys(patch).length === 0) {
    const [existing] = await db.select(USER_COLS).from(users).where(eq(users.id, id)).limit(1)
    if (!existing) throw createError({ statusCode: 404, message: 'Profil introuvable' })
    return existing
  }

  const [row] = await db.update(users).set(patch).where(eq(users.id, id)).returning(USER_COLS)
  if (!row) throw createError({ statusCode: 404, message: 'Profil introuvable' })

  // Désactivation = révocation immédiate de toutes les sessions du compte.
  if (patch.is_active === false) await revokeAllUserSessions(id)

  void logActivity(event, 'update', 'user', id, null)
  return row
})
