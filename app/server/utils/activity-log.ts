import type { H3Event } from 'h3'
import { eq, inArray } from 'drizzle-orm'
import { useDb } from '~/server/db'
import { activityLogs, maintenanceTypes, sites } from '~/server/db/schema'
import { resolveSessionUser } from '~/server/utils/session'

// Libellé lisible d'un compte pour l'historique, indépendant de son existence
// future en base (nom + rôle plutôt que le seul email, moins parlant une fois
// le compte supprimé ou modifié).
export function formatUserLabel(u: Record<string, unknown>): string | null {
  const str = (v: unknown): string | undefined => typeof v === 'string' && v.length > 0 ? v : undefined
  const name = [str(u.first_name), str(u.last_name)].filter(Boolean).join(' ').trim()
  const role = str(u.role)
  if (name) return role ? `${name} (${role})` : name
  return str(u.email) ?? null
}

// Une maintenance n'a pas de nom propre : libellé = site + type(s) pour l'historique
// (la date est déjà une colonne du journal, inutile de la dupliquer dans le libellé).
export async function maintenanceLabel(m: { site_id: string; types: string | null }): Promise<string> {
  const [site] = await useDb().select({ name: sites.name }).from(sites).where(eq(sites.id, m.site_id)).limit(1)
  const siteName = site?.name ?? 'Site supprimé'

  const ids = (m.types ?? '').split(',').map(t => t.trim()).filter(Boolean)
  if (!ids.length) return siteName

  const rows = await useDb().select({ label: maintenanceTypes.label }).from(maintenanceTypes).where(inArray(maintenanceTypes.id, ids))
  const typeLabel = rows.map(r => r.label).join(', ')
  return typeLabel ? `${siteName} (${typeLabel})` : siteName
}

export async function logActivity(
  event         : H3Event,
  action        : 'create' | 'update' | 'delete',
  resource_type : string,
  resource_id   : string | null,
  resource_label: string | null,
): Promise<void> {
  try {
    const user = await resolveSessionUser(event)
    if (!user) return

    await useDb().insert(activityLogs).values({
      user_id       : user.id,
      user_email    : user.email,
      action,
      resource_type : resource_type,
      resource_id   : resource_id,
      resource_label: resource_label,
    })
  } catch { /* non-bloquant */ }
}
