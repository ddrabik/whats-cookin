export async function requireClerkUserId(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> }
}) {
  const identity = await ctx.auth.getUserIdentity()
  if (!identity) {
    throw new Error('Not authenticated')
  }
  return identity.subject
}
