export type PublicAppointment = {
  id: string
  sequenceNumber: number
  startAt: string
  endAt: string
  status: string
  faithfulName: string
  faithfulLastName: string
}

export type AvailableDay = {
  date: string
  available: boolean
}

export type AvailableTime = {
  startAt: string
  endAt: string
  available: boolean
}

export type ConfirmedAppointment = {
  code: string
  appointment: PublicAppointment
  receiptAvailable?: boolean
}

export type LookupResponse = {
  appointment: PublicAppointment
}

export type RecoveryResponse = {
  message: string
  code?: string
}

export type ApiError = {
  code?: string
  message?: string
}

export async function requestJson<T>(
  url: string,
  init?: RequestInit,
  fallbackMessage = 'Nao foi possivel concluir agora. Tente novamente em alguns minutos.',
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const message = typeof data?.message === 'string' ? data.message : fallbackMessage
    throw new Error(humanizeError(message))
  }

  return data as T
}

export function formatDateLong(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(new Date(value))
}

export function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

export function toDateOnly(date: Date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

export function addDays(date: Date, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

function humanizeError(message: string) {
  const normalized = message.toLowerCase()

  if (normalized.includes('not found') || normalized.includes('nao encontrado') || normalized.includes('não encontrado')) {
    return 'Nao encontramos um agendamento ativo com esses dados.'
  }

  if (normalized.includes('hor')) {
    return 'Esse horario nao esta mais disponivel. Escolha outro horario.'
  }

  if (normalized.includes('prazo')) {
    return 'Este agendamento ja esta fora do prazo permitido para cancelamento pelo codigo.'
  }

  if (normalized.includes('janela')) {
    return 'Escolha um horario dentro do periodo permitido para agendamento.'
  }

  return message || 'Nao foi possivel concluir agora. Tente novamente em alguns minutos.'
}
