import { proxyAuthenticatedGet, proxyAuthenticatedJson } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyAuthenticatedGet('/users', request)
}

export function POST(request: Request) {
  return proxyAuthenticatedJson('/users', request)
}
