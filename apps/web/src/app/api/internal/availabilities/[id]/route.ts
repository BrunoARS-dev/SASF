import { proxyAuthenticatedDelete, proxyAuthenticatedPatch } from '@/lib/api-proxy'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAuthenticatedPatch(`/availabilities/${id}`, request)
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAuthenticatedDelete(`/availabilities/${id}`, request)
}
