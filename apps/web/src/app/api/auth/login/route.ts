import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export async function POST(request: Request) {
  const body = await request.text()
  const response = await fetch(`${API_URL}${API_PREFIX}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body,
    cache: 'no-store',
  })
  const payload = await response.text()
  const nextResponse = new NextResponse(payload, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('content-type') ?? 'application/json',
    },
  })
  const setCookie = response.headers.get('set-cookie')

  if (setCookie) {
    nextResponse.headers.set('set-cookie', setCookie)
  }

  return nextResponse
}
