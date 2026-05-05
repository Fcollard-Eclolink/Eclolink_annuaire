export default defineEventHandler(async (event) => {
  const res  = await sbFetch(event, '/auth/v1/user')
  const user = await res.json()
  // On n'expose que le strict minimum au client
  return { id: user.id as string, email: user.email as string }
})
