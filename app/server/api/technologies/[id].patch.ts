interface TechnologyPatch {
  label           ?: string
  simpleicons_slug?: string | null
  svg             ?: string | null
  sort_order      ?: number
}

export default defineEventHandler(async (event): Promise<Technology> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  const body = await readBody<TechnologyPatch>(event)
  if (body.label !== undefined && !body.label.trim()) {
    throw createError({ statusCode: 400, message: 'Le label est requis' })
  }

  // Sanitize SVG : strip event handlers, scripts, javascript: URLs (XSS prevention)
  const safeBody = body.svg !== undefined
    ? { ...body, svg: body.svg ? sanitizeSvg(body.svg) : null }
    : body

  const res = await sbFetch(event, `/rest/v1/eclolink_technologies?id=eq.${encodeURIComponent(id)}`, {
    method : 'PATCH',
    body   : JSON.stringify(safeBody),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Technology[]
  if (!rows[0]) throw createError({ statusCode: 404, message: 'Technologie introuvable' })
  return rows[0]
})
