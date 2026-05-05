export default defineEventHandler(async (event) => {
  const res = await sbFetch(event, '/rest/v1/eclolink_groups?select=*&order=name.asc')
  return res.json()
})
