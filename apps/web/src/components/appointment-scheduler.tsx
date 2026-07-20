'use client'

import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  addDays,
  AvailableDay,
  AvailableTime,
  ConfirmedAppointment,
  formatTime,
  requestJson,
  toDateOnly,
} from '@/lib/public-api'

const WINDOW_DAYS = 30

export function AppointmentScheduler() {
  const router = useRouter()
  const today = useMemo(() => startOfToday(), [])
  const days = useMemo(() => Array.from({ length: WINDOW_DAYS }, (_, index) => addDays(today, index)), [today])
  const [availableDays, setAvailableDays] = useState<Map<string, boolean>>(new Map())
  const [selectedDate, setSelectedDate] = useState(toDateOnly(today))
  const [availableTimes, setAvailableTimes] = useState<AvailableTime[]>([])
  const [selectedTime, setSelectedTime] = useState<string>('')
  const [form, setForm] = useState({ faithfulName: '', faithfulLastName: '', faithfulPhone: '' })
  const [loadingDays, setLoadingDays] = useState(true)
  const [loadingTimes, setLoadingTimes] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const from = toDateOnly(days[0])
    const to = toDateOnly(days[days.length - 1])

    setLoadingDays(true)
    requestJson<{ days: AvailableDay[] }>(`/api/public/availability/days?from=${from}&to=${to}`)
      .then((result) => {
        if (!active) return
        const map = new Map(result.days.map((day) => [day.date, day.available]))
        setAvailableDays(map)
        const firstAvailable = result.days.find((day) => day.available)
        if (firstAvailable) {
          setSelectedDate(firstAvailable.date)
        }
      })
      .catch(() => {
        if (active) setError('Nao conseguimos carregar os dias agora. Tente novamente em alguns minutos.')
      })
      .finally(() => {
        if (active) setLoadingDays(false)
      })

    return () => {
      active = false
    }
  }, [days])

  useEffect(() => {
    let active = true
    setLoadingTimes(true)
    setSelectedTime('')

    requestJson<{ times: AvailableTime[] }>(`/api/public/availability/times?date=${selectedDate}`)
      .then((result) => {
        if (active) setAvailableTimes(result.times)
      })
      .catch(() => {
        if (active) setError('Nao conseguimos carregar os horarios desse dia.')
      })
      .finally(() => {
        if (active) setLoadingTimes(false)
      })

    return () => {
      active = false
    }
  }, [selectedDate])

  const timeGrid = useMemo(() => buildTimeGrid(selectedDate, availableTimes), [selectedDate, availableTimes])
  const selectedDateObject = useMemo(() => new Date(`${selectedDate}T12:00:00`), [selectedDate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')

    if (!selectedTime) {
      setError('Escolha um horario disponivel antes de continuar.')
      return
    }

    setSubmitting(true)
    try {
      const result = await requestJson<ConfirmedAppointment>('/api/public/appointments', {
        method: 'POST',
        body: JSON.stringify({
          faithfulName: form.faithfulName,
          faithfulLastName: form.faithfulLastName,
          faithfulPhone: form.faithfulPhone,
          startAt: selectedTime,
        }),
      })

      sessionStorage.setItem('sasf_confirmation', JSON.stringify(result))
      router.push('/agendamento/confirmado')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel agendar agora.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="workspace">
      <section className="flow-panel" aria-labelledby="booking-title">
        <div className="section-heading">
          <div>
            <h2 id="booking-title">Escolha o dia e horario</h2>
          </div>
        </div>

        <div className="day-rail" aria-label="Proximos dias">
          {days.map((day) => {
            const date = toDateOnly(day)
            const available = availableDays.get(date) ?? false
            return (
              <button
                className="day-button"
                key={date}
                type="button"
                aria-pressed={selectedDate === date}
                disabled={loadingDays || !available}
                onClick={() => setSelectedDate(date)}
              >
                <span>{weekdayShort(day)}</span>
                <strong>{day.getDate().toString().padStart(2, '0')}</strong>
                <span>{available ? monthShort(day) : 'sem vaga'}</span>
              </button>
            )
          })}
        </div>

        <MiniCalendar
          days={days}
          selectedDate={selectedDate}
          availableDays={availableDays}
          loading={loadingDays}
          onSelect={setSelectedDate}
        />

        <div className="section-heading">
          <div>
            <h2>Horarios de {selectedDateObject.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' })}</h2>
          </div>
        </div>

        {loadingTimes ? (
          <p className="helper-text">Carregando horarios...</p>
        ) : (
          <div className="time-grid" aria-label="Horarios disponiveis e indisponiveis">
            {timeGrid.map((slot) => (
              <button
                className="time-button"
                key={slot.label}
                type="button"
                aria-pressed={selectedTime === slot.startAt}
                disabled={!slot.available}
                onClick={() => setSelectedTime(slot.startAt)}
              >
                {slot.available ? slot.label : `${slot.label} indisponivel`}
              </button>
            ))}
          </div>
        )}

        <form className="form-grid" onSubmit={submit}>
          <div className="field">
            <label htmlFor="faithfulName">Nome</label>
            <input
              id="faithfulName"
              autoComplete="given-name"
              required
              value={form.faithfulName}
              onChange={(event) => setForm((current) => ({ ...current, faithfulName: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="faithfulLastName">Ultimo sobrenome</label>
            <input
              id="faithfulLastName"
              autoComplete="family-name"
              required
              value={form.faithfulLastName}
              onChange={(event) => setForm((current) => ({ ...current, faithfulLastName: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="faithfulPhone">Telefone</label>
            <input
              id="faithfulPhone"
              autoComplete="tel"
              inputMode="tel"
              required
              value={form.faithfulPhone}
              onChange={(event) => setForm((current) => ({ ...current, faithfulPhone: event.target.value }))}
            />
          </div>
          <button className="primary-button" type="submit" disabled={submitting || loadingTimes}>
            {submitting ? 'Agendando...' : 'Agendar'}
          </button>
          {error ? <div className="status-box error">{error}</div> : null}
        </form>
      </section>

      <aside className="side-panel">
        <div className="section-heading">
          <div>
            <h2>Antes de confirmar</h2>
          </div>
        </div>
        <div className="appointment-summary">
          <div className="summary-row">
            <span>Dia</span>
            <strong>{selectedDateObject.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</strong>
          </div>
          <div className="summary-row">
            <span>Horario</span>
            <strong>{selectedTime ? formatTime(selectedTime) : 'Escolha acima'}</strong>
          </div>
          <div className="summary-row">
            <span>Codigo</span>
            <strong>gerado apos confirmar</strong>
          </div>
        </div>
        <div className="link-list">
          <a href="/consultar">Consultar com codigo <span aria-hidden="true">&gt;</span></a>
          <a href="/recuperar-codigo">Recuperar codigo <span aria-hidden="true">&gt;</span></a>
        </div>
      </aside>
    </div>
  )
}

function MiniCalendar({
  days,
  selectedDate,
  availableDays,
  loading,
  onSelect,
}: {
  days: Date[]
  selectedDate: string
  availableDays: Map<string, boolean>
  loading: boolean
  onSelect: (date: string) => void
}) {
  return (
    <div className="mini-calendar">
      <div className="calendar-header">
        <h3>Calendario dos proximos 30 dias</h3>
      </div>
      <div className="calendar-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, index) => (
          <div className="calendar-weekday" key={`${day}-${index}`}>
            {day}
          </div>
        ))}
        {Array.from({ length: days[0].getDay() }).map((_, index) => (
          <span key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const date = toDateOnly(day)
          const available = availableDays.get(date) ?? false
          return (
            <button
              className="calendar-day"
              key={date}
              type="button"
              aria-pressed={selectedDate === date}
              disabled={loading || !available}
              onClick={() => onSelect(date)}
            >
              <strong>{day.getDate()}</strong>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function buildTimeGrid(date: string, availableTimes: AvailableTime[]) {
  const sortedAvailableTimes = [...availableTimes].sort(
    (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime(),
  )
  const availableByLabel = new Map(sortedAvailableTimes.map((time) => [formatTime(time.startAt), time]))
  const grid: Array<{ label: string; startAt: string; available: boolean }> = []
  const range = getVisibleTimeRange(sortedAvailableTimes)

  for (let minutes = range.startMinutes; minutes <= range.endMinutes; minutes += 30) {
    const label = minutesToLabel(minutes)
    const available = availableByLabel.get(label)
    const startAt = available?.startAt ?? new Date(`${date}T${label}:00.000`).toISOString()
    grid.push({ label, startAt, available: Boolean(available) })
  }

  return grid
}

function getVisibleTimeRange(availableTimes: AvailableTime[]) {
  if (availableTimes.length === 0) {
    return {
      startMinutes: 7 * 60,
      endMinutes: 20 * 60 + 30,
    }
  }

  const labels = availableTimes.map((time) => formatTime(time.startAt))
  const minutes = labels.map(labelToMinutes)
  const first = Math.min(...minutes)
  const last = Math.max(...minutes)

  return {
    startMinutes: Math.max(0, first - 60),
    endMinutes: Math.min(23 * 60 + 30, last + 60),
  }
}

function minutesToLabel(minutes: number) {
  const hour = Math.floor(minutes / 60)
  const minute = minutes % 60
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
}

function labelToMinutes(label: string) {
  const [hour, minute] = label.split(':').map(Number)
  return hour * 60 + minute
}

function startOfToday() {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

function weekdayShort(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short' }).format(date).replace('.', '')
}

function monthShort(date: Date) {
  return new Intl.DateTimeFormat('pt-BR', { month: 'short' }).format(date).replace('.', '')
}
