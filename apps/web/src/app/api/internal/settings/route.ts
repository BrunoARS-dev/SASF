import { proxyAuthenticatedGet, proxyAuthenticatedPatch } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyAuthenticatedGet('/settings', request)
}

export function PATCH(request: Request) {
  return proxyAuthenticatedPatch('/settings', request)
}
