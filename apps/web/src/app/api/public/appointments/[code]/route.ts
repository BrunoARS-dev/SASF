import { proxyDelete } from '@/lib/api-proxy'

export async function DELETE(_request: Request, context: { params: Promise<{ code: string }> }) {
  const { code } = await context.params
  return proxyDelete(`/public/appointments/${encodeURIComponent(code)}`)
}
