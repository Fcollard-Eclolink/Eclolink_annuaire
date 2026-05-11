export default defineEventHandler(async (event): Promise<Technology[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_technologies?order=label.asc')
  return (await res.json()) as Technology[]
})
