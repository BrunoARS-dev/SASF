import { proxyAuthenticatedGet, proxyAuthenticatedJson } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyAuthenticatedGet('/availabilities', request)
}

export function POST(request: Request) {
  return proxyAuthenticatedJson('/availabilities', request)
}
