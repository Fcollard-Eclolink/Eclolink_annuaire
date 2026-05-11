interface TechnologyCreate {
  label           : string
  simpleicons_slug?: string | null
  svg             ?: string | null
  sort_order      ?: number
}

export default defineEventHandler(async (event): Promise<Technology> => {
  const body = await readBody<TechnologyCreate>(event)
  if (!body.label?.trim()) throw createError({ statusCode: 400, message: 'Le label est requis' })

  const res = await sbFetch(event, '/rest/v1/eclolink_technologies', {
    method : 'POST',
    body   : JSON.stringify({ id: crypto.randomUUID(), ...body, label: body.label.trim() }),
    headers: { Prefer: 'return=representation' },
  })

  const rows = (await res.json()) as Technology[]
  if (!rows[0]) throw createError({ statusCode: 500, message: 'Erreur lors de la création' })
  return rows[0]
})
