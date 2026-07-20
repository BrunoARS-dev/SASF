import { proxyJson } from '@/lib/api-proxy'

export function POST(request: Request) {
  return proxyJson('/public/appointments/lookup', request)
}
