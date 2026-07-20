import { cookies } from 'next/headers'

const API_URL = process.env.API_URL ?? 'http://localhost:3001'
const API_PREFIX = '/api/v1'

export type InternalAppointmentStatus =
  | 'AGENDADO'
  | 'CANCELADO'
  | 'PENDENTE_CONFIRMACAO'
  | 'REALIZADO'
  | 'AUSENTE'

export type ManagerAppointment = {
  id: string
  sequenceNumber: number
  startAt: string
  endAt: string
  status: InternalAppointmentStatus
  faithfulName: string
  faithfulPhone: string
  faithfulLastName: string
  priest: {
    id: string
    name: string
  }
  cancelledAt: string | null
  completedAt: string | null
}

export type ManagerAgendaDay = {
  items: ManagerAppointment[]
  page: number
  limit: number
  total: number
}

export type PaginatedResponse<T> = {
  items: T[]
  page: number
  limit: number
  total: number
}

export type ManagerPriest = {
  id: string
  name: string
  active: boolean
  appointmentDurationMin: number | null
  user: {
    id: string
    username: string
    email: string
    active: boolean
  }
}

export type ManagerAvailability = {
  id: string
  dayOfWeek: number
  startTime: string
  endTime: string
  active: boolean
  priest: {
    id: string
    name: string
  }
}

export type ManagerBlockedSlot = {
  id: string
  startAt: string
  endAt: string
  operationalReason: string | null
  active: boolean
  priest: {
    id: string
    name: string
  }
  createdBy: {
    id: string
    name: string
  }
}

export type ManagerSetting = {
  key: string
  value: string
  valueType: 'STRING' | 'INTEGER' | 'BOOLEAN'
  description: string | null
  updatedAt: string
}

export type ManagerQrCode = {
  id: string
  publicPath: string
  version: number
  active: boolean
  generatedAt: string
  url: string
}

export type CreateManualAppointmentInput = {
  faithfulName: string
  faithfulLastName: string
  faithfulPhone: string
  startAt: string
  priestId?: string
}

export async function getAgendaDay(date: string): Promise<ManagerAgendaDay> {
  const response = await fetchAuthenticated(`/appointments/day?date=${date}&limit=80`)

  if (!response.ok) {
    return {
      items: [],
      page: 1,
      limit: 80,
      total: 0,
    }
  }

  return (await response.json()) as ManagerAgendaDay
}

export async function getPriests(): Promise<PaginatedResponse<ManagerPriest>> {
  return getPaginated('/priests?limit=100')
}

export async function getAvailabilities(): Promise<PaginatedResponse<ManagerAvailability>> {
  return getPaginated('/availabilities?limit=120')
}

export async function getBlockedSlots(): Promise<PaginatedResponse<ManagerBlockedSlot>> {
  return getPaginated('/blocked-slots?limit=100')
}

export async function getSettings(): Promise<{ items: ManagerSetting[] }> {
  const response = await fetchAuthenticated('/settings')
  if (!response.ok) return { items: [] }

  return (await response.json()) as { items: ManagerSetting[] }
}

export async function getCurrentQrCode(): Promise<{ qrCode: ManagerQrCode | null }> {
  const response = await fetchAuthenticated('/qr-codes/current')
  if (!response.ok) return { qrCode: null }

  return (await response.json()) as { qrCode: ManagerQrCode | null }
}

export async function createManualAppointment(input: CreateManualAppointmentInput) {
  const response = await postAuthenticatedJson('/appointments/manual', input)
  if (!response.ok) {
    const error = await response.json().catch(() => null)
    throw new Error(typeof error?.message === 'string' ? error.message : 'Nao foi possivel salvar agora.')
  }

  return response.json() as Promise<unknown>
}

export function todayDateOnly() {
  const now = new Date()
  const year = now.getFullYear()
  const month = (now.getMonth() + 1).toString().padStart(2, '0')
  const day = now.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

async function getPaginated<T>(path: string): Promise<PaginatedResponse<T>> {
  const response = await fetchAuthenticated(path)
  if (!response.ok) {
    return {
      items: [],
      page: 1,
      limit: 100,
      total: 0,
    }
  }

  return (await response.json()) as PaginatedResponse<T>
}

async function fetchAuthenticated(path: string) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  return fetch(`${API_URL}${API_PREFIX}${path}`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: 'no-store',
  })
}

async function postAuthenticatedJson(path: string, body: unknown) {
  const cookieStore = await cookies()
  const cookieHeader = cookieStore
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join('; ')

  return fetch(`${API_URL}${API_PREFIX}${path}`, {
    method: 'POST',
    headers: {
      Cookie: cookieHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
}
