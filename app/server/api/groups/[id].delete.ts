export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  // Détache les sites du groupe avant suppression
  await sbFetch(event, `/rest/v1/eclolink_sites?group_id=eq.${encodeURIComponent(id)}`, {
    method  : 'PATCH',
    body    : JSON.stringify({ group_id: null }),
    headers : { Prefer: 'return=minimal' },
  })

  await sbFetch(event, `/rest/v1/eclolink_groups?id=eq.${encodeURIComponent(id)}`, {
    method  : 'DELETE',
    headers : { Prefer: 'return=minimal' },
  })

  return { ok: true }
})
