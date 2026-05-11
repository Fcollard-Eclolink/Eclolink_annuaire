export default defineEventHandler(async (event): Promise<Agency[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_agencies?order=name.asc')
  return (await res.json()) as Agency[]
})
