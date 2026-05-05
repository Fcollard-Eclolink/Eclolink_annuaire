export default defineEventHandler(async (event): Promise<SupabaseUser> => {
  const res  = await sbFetch(event, '/auth/v1/user')
  const user = (await res.json()) as SupabaseUser
  // N'expose que le strict minimum au client
  return { id: user.id, email: user.email }
})
