export default defineEventHandler(async (event) => {
  const res   = await sbFetch(event, '/rest/v1/eclolink_sites?select=*&order=name.asc')
  return res.json()
})
