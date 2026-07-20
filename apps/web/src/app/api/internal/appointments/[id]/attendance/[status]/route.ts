import { proxyAuthenticatedPatch } from '@/lib/api-proxy'

const allowedStatuses = new Set(['realized', 'absent'])

export async function PATCH(request: Request, context: { params: Promise<{ id: string; status: string }> }) {
  const { id, status } = await context.params

  if (!allowedStatuses.has(status)) {
    return Response.json({ message: 'Acao invalida.' }, { status: 404 })
  }

  return proxyAuthenticatedPatch(`/appointments/${id}/attendance/${status}`, request)
}
