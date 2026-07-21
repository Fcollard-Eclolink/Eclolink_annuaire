import type { H3Event } from 'h3'
import { useDb } from '~/server/db'
import { activityLogs } from '~/server/db/schema'
import { getSessionUser } from '~/server/utils/auth'

export async function logActivity(
  event         : H3Event,
  action        : 'create' | 'update' | 'delete',
  resource_type : string,
  resource_id   : string | null,
  resource_label: string | null,
): Promise<void> {
  try {
    const user = await getSessionUser(event)
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
