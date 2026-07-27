import { proxyAuthenticatedPatch } from '@/lib/api-proxy'

export async function PATCH(
  request: Request,
  context: { params: Promise<{ key: string }> },
) {
  const { key } = await context.params
  return proxyAuthenticatedPatch(`/roles/${key}/permissions`, request)
}
