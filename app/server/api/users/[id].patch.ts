import type { UserProfile } from '~/server/utils/types'

const VALID_ROLES = ['sysadmin', 'dev', 'pm', 'crea', 'viewer'] as const

interface UserProfilePatch {
  first_name?: string
  last_name ?: string
  role      ?: string
  agency    ?: string | null
  job_title ?: string | null
}

export default defineEventHandler(async (event): Promise<UserProfile> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<UserProfilePatch>(event)

  const safePayload: Record<string, unknown> = {}
  if (body.first_name !== undefined) safePayload.first_name = requireString(body.first_name, 'Prénom', 100)
  if (body.last_name  !== undefined) safePayload.last_name  = requireString(body.last_name,  'Nom',    100)
  if (body.agency     !== undefined) safePayload.agency     = clampString(body.agency, 200)
  if (body.job_title  !== undefined) safePayload.job_title  = clampString(body.job_title, 200)
  if (body.role       !== undefined) {
    if (!(VALID_ROLES as readonly string[]).includes(body.role)) {
      throw createError({ statusCode: 400, message: 'Rôle invalide' })
    }
    safePayload.role = body.role
  }

  const res = await sbFetch(event, `/rest/v1/eclolink_user_profiles?user_id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(safePayload),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as UserProfile[]
  if (!rows.length) throw createError({ statusCode: 404, message: 'Profil introuvable' })
  return rows[0]
})
