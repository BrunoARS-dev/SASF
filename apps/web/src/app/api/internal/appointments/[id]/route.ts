import { proxyAuthenticatedDelete } from '@/lib/api-proxy'

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params
  return proxyAuthenticatedDelete(`/appointments/${id}`, request)
}
