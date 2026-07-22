import { logActivity } from '~/server/utils/activity-log'

// Journalisation automatique de TOUTE mutation réussie sur /api/<ressource>[/<id>].
// Couvre toutes les entités (présentes et futures) sans dupliquer d'appel dans
// chaque route. Les sous-routes (ex. users/<id>/reset-password) gardent leur log
// dédié et sont ignorées ici (profondeur > 3).

const RESOURCE_SINGULAR: Record<string, string> = {
  sites             : 'site',
  groups            : 'group',
  clients           : 'client',
  maintenances      : 'maintenance',
  'maintenance-types': 'maintenance-type',
  technologies      : 'technology',
  agencies          : 'agency',
  hosters           : 'hoster',
  'web-servers'     : 'web-server',
  'dns-providers'   : 'dns-provider',
  databases         : 'database',
  users             : 'user',
}

const ACTION: Record<string, 'create' | 'update' | 'delete'> = {
  POST  : 'create',
  PATCH : 'update',
  DELETE: 'delete',
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook('afterResponse', async (event, response) => {
    try {
      const action = ACTION[event.method]
      if (!action) return

      const path = event.path.split('?')[0]
      if (!path.startsWith('/api/')) return

      const seg = path.split('/').filter(Boolean) // ['api', <resource>, <id>?]
      // Uniquement les routes CRUD standard : /api/<resource> ou /api/<resource>/<id>.
      if (seg.length < 2 || seg.length > 3) return

      const resource = seg[1]!
      if (resource === 'auth' || resource === 'logs') return

      const status = event.node.res.statusCode
      if (status < 200 || status >= 300) return

      const body = response?.body
      const obj  = (body && typeof body === 'object') ? body as Record<string, unknown> : undefined

      const idFromBody    = typeof obj?.id === 'string' ? obj.id : (typeof obj?.user_id === 'string' ? obj.user_id : undefined)
      const labelFromBody = typeof obj?.name === 'string' ? obj.name
        : typeof obj?.label === 'string' ? obj.label
          : typeof obj?.email === 'string' ? obj.email
            : undefined

      await logActivity(
        event,
        action,
        RESOURCE_SINGULAR[resource] ?? resource,
        idFromBody ?? seg[2] ?? null,
        labelFromBody ?? null,
      )
    } catch { /* journalisation non bloquante */ }
  })
})
