import type { H3Event } from 'h3'

function extractUserFromToken(token: string): { id: string; email: string } | null {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as Record<string, unknown>
    return { id: payload.sub as string, email: payload.email as string }
  } catch {
    return null
  }
}

export async function logActivity(
  event         : H3Event,
  action        : 'create' | 'update' | 'delete',
  resource_type : string,
  resource_id   : string | null,
  resource_label: string | null,
): Promise<void> {
  try {
    const token = getAccessToken(event)
    if (!token) return
    const user = extractUserFromToken(token)
    if (!user) return

    await sbFetch(event, '/rest/v1/eclolink_activity_logs', {
      method : 'POST',
      body   : JSON.stringify({
        id            : crypto.randomUUID(),
        user_id       : user.id,
        user_email    : user.email,
        action,
        resource_type,
        resource_id,
        resource_label,
      }),
      headers: { Prefer: 'return=minimal' },
    })
  } catch { /* non-bloquant */ }
}
