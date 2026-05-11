export default defineEventHandler(async (event): Promise<DnsProvider[]> => {
  const res = await sbFetch(event, '/rest/v1/eclolink_dns_providers?order=name.asc')
  return (await res.json()) as DnsProvider[]
})
