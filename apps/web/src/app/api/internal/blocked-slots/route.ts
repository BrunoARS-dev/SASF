import { proxyAuthenticatedGet, proxyAuthenticatedJson } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyAuthenticatedGet('/blocked-slots', request)
}

export function POST(request: Request) {
  return proxyAuthenticatedJson('/blocked-slots', request)
}
