import { NextResponse } from 'next/server'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export async function proxyGet(path: string, request: Request) {
  const source = new URL(request.url)
  return proxy(`${path}${source.search}`, { method: 'GET' })
}

export async function proxyJson(path: string, request: Request, method = 'POST') {
  const body = await request.text()
  return proxy(path, {
    method,
    body,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

export async function proxyDelete(path: string) {
  return proxy(path, { method: 'DELETE' })
}

export async function proxyAuthenticatedGet(path: string, request: Request) {
  const source = new URL(request.url)
  return proxy(`${path}${source.search}`, {
    method: 'GET',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
  })
}

export async function proxyAuthenticatedPatch(path: string, request: Request) {
  const body = await request.text()
  return proxy(path, {
    method: 'PATCH',
    body,
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      'Content-Type': 'application/json',
    },
  })
}

export async function proxyAuthenticatedJson(path: string, request: Request, method = 'POST') {
  const body = await request.text()
  return proxy(path, {
    method,
    body,
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
      'Content-Type': 'application/json',
    },
  })
}

export async function proxyAuthenticatedDelete(path: string, request: Request) {
  return proxy(path, {
    method: 'DELETE',
    headers: {
      Cookie: request.headers.get('cookie') ?? '',
    },
  })
}

async function proxy(path: string, init: RequestInit) {
  const response = await fetch(`${API_URL}${API_PREFIX}${path}`, {
    ...init,
    cache: 'no-store',
  })
  const contentType = response.headers.get('content-type') ?? 'application/json'
  const body = await response.text()

  return new NextResponse(body, {
    status: response.status,
    headers: {
      'Content-Type': contentType,
    },
  })
}
