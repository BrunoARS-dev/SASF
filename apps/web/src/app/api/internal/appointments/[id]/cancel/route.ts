import { proxyAuthenticatedPatch } from '@/lib/api-proxy'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAuthenticatedPatch(`/appointments/${id}/cancel`, request)
}
