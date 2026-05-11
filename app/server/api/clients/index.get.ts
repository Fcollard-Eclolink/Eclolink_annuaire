export default defineEventHandler(async (event): Promise<Client[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_clients?select=*&order=name.asc')
  return (await res.json()) as Client[]
})
