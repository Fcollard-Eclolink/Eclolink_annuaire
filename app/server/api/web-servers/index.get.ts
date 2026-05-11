export default defineEventHandler(async (event): Promise<WebServer[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_web_servers?order=name.asc')
  return (await res.json()) as WebServer[]
})
