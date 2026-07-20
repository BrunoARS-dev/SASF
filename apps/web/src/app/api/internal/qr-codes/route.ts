import { proxyAuthenticatedJson } from '@/lib/api-proxy'

export function POST(request: Request) {
  return proxyAuthenticatedJson('/qr-codes', request)
}
