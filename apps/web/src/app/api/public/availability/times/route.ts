import { proxyGet } from '@/lib/api-proxy'

export function GET(request: Request) {
  return proxyGet('/public/availability/times', request)
}
