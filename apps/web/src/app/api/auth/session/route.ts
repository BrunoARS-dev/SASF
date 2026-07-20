import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export async function GET(request: Request) {
  const response = await fetch(`${API_URL}${API_PREFIX}/auth/session`, {
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
    cache: 'no-store',
  })
  const payload = await response.text()

  return new NextResponse(payload, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
}
