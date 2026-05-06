export default defineEventHandler(async (event): Promise<{ ok: boolean }> => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'ID requis' })

  await sbFetch(event, `/rest/v1/eclolink_sites?id=eq.${encodeURIComponent(id)}`, {
    method : 'DELETE',
    headers: { Prefer: 'return=minimal' },
  })

  return { ok: true }
})
