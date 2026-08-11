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

// Champs éditables par tout utilisateur sur SON PROPRE profil.
const SELF_FIELDS = ['first_name', 'last_name', 'agency', 'job_title'] as const
// Champs privilégiés : sysadmin uniquement (rôle, activation, édition d'un AUTRE compte).
const ADMIN_ONLY_FIELDS = ['role', 'is_active'] as const

// Liste blanche stricte (default-deny) : tout champ du body absent des deux listes
// ci-dessus est rejeté explicitement, plutôt que d'être silencieusement ignoré —
// un futur champ ajouté à UserProfilePatch sans être classé ici casse la route au
// lieu de devenir editable par erreur.
export default defineEventHandler(async (event): Promise<UserProfile> => {
  const actor = await requireUser(event)
  const id = requireId(event)

  const isSelf  = id === actor.id
  const isAdmin = actor.role === 'sysadmin'
  if (!isSelf && !isAdmin) {
    throw createError({ statusCode: 403, message: 'Accès refusé' })
  }

  const body = await readBody<UserProfilePatch>(event)
  const allowedFields: readonly string[] = isAdmin ? [...SELF_FIELDS, ...ADMIN_ONLY_FIELDS] : SELF_FIELDS
  for (const key of Object.keys(body)) {
    if (!allowedFields.includes(key)) {
      throw createError({ statusCode: 403, message: `Champ non modifiable : ${key}` })
    }
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
  return row
})
