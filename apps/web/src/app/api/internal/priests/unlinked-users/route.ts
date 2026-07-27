import { proxyAuthenticatedGet } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyAuthenticatedGet('/priests/unlinked-users', request)
}
