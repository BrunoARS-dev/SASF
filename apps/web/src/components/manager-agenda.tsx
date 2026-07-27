'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ManualAppointmentPanel } from '@/components/manager-operation-panels'
import { DeleteCancelledAppointmentAction, ManagerAgendaActions } from '@/components/manager-agenda-actions'
import type { InternalUser } from '@/lib/auth'
import { hasPermission } from '@/lib/permissions'
import type { ManagerAgendaDay, ManagerAppointment, ManagerPriest } from '@/lib/manager-api'

export function ManagerAgenda({
  user,
  date,
  agenda,
  priests,
  pendingDates,
}: {
  user: InternalUser
  date: string
  agenda: ManagerAgendaDay
  priests?: ManagerPriest[]
  pendingDates: Array<{ date: string; count: number }>
}) {
  const formattedDate = formatDate(date)
  const pendingCount = agenda.items.filter((item) => canMarkAttendance(item.status)).length
  const canCreateManual = hasPermission(user, 'agenda.create_manual')
  const [isCreatingManual, setIsCreatingManual] = useState(false)

  return (
    <div className="manager-content">
      <section className="manager-title">
        <p className="manager-eyebrow">Agenda</p>
        <h1>{formattedDate}</h1>
        {user.role === 'PADRE' ? <p>Mostrando apenas os atendimentos vinculados ao seu perfil.</p> : null}
      </section>

      <AgendaDateControls
        date={date}
        canCreateManual={canCreateManual}
        isCreatingManual={isCreatingManual}
        onCreateManual={() => setIsCreatingManual(true)}
        onDateChange={() => setIsCreatingManual(false)}
        pendingDates={pendingDates}
      />

      {canCreateManual && isCreatingManual ? (
        <div className="agenda-manual-slot">
          <ManualAppointmentPanel priests={priests ?? []} onCancel={() => setIsCreatingManual(false)} />
        </div>
      ) : null}

      <div className="agenda-summary-grid" aria-label="Resumo da agenda">
        <SummaryItem label="Atendimentos" value={agenda.total.toString()} />
        <SummaryItem label="Pendentes" value={pendingCount.toString()} />
        <SummaryItem label="Perfil" value={roleLabel(user.role)} />
      </div>

      {agenda.items.length === 0 ? (
        <div className="manager-empty">
          <strong>Nenhum atendimento nesta data</strong>
        </div>
      ) : (
        <div className="agenda-list">
          {agenda.items.map((appointment) => (
            <AgendaItem key={appointment.id} appointment={appointment} user={user} />
          ))}
        </div>
      )}
    </div>
  )
}

function AgendaMonthCalendar({
  date,
  pendingDates,
}: {
  date: string
  pendingDates: Array<{ date: string; count: number }>
}) {
  const [year, month] = date.split('-').map(Number)
  const firstDay = new Date(year, month - 1, 1, 12)
  const daysInMonth = new Date(year, month, 0, 12).getDate()
  const emptyDays = Array.from({ length: firstDay.getDay() })
  const days = Array.from({ length: daysInMonth }, (_, index) => index + 1)
  const pendingMap = new Map(pendingDates.map((item) => [item.date, item.count]))
  const monthLabel = new Intl.DateTimeFormat('pt-BR', {
    month: 'long',
    year: 'numeric',
  }).format(firstDay)

  return (
    <section className="agenda-month-calendar" aria-labelledby="agenda-calendar-title">
      <div className="agenda-calendar-heading">
        <div>
          <span>Calendário</span>
          <h2 id="agenda-calendar-title">{monthLabel}</h2>
        </div>
        <div className="agenda-calendar-legend">
          <i aria-hidden="true" />
          Aguardando confirmação
        </div>
      </div>
      <div className="agenda-calendar-grid">
        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((weekday, index) => (
          <span className="agenda-calendar-weekday" key={`${weekday}-${index}`}>
            {weekday}
          </span>
        ))}
        {emptyDays.map((_, index) => (
          <span aria-hidden="true" key={`empty-${index}`} />
        ))}
        {days.map((day) => {
          const dayDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const pendingCount = pendingMap.get(dayDate) ?? 0
          const selected = dayDate === date

          return (
            <Link
              className="agenda-calendar-day"
              data-selected={selected || undefined}
              href={`/gestor/agenda?date=${dayDate}`}
              key={dayDate}
              aria-label={`${day} de ${monthLabel}${pendingCount ? `, ${pendingCount} aguardando confirmação` : ''}`}
            >
              {day}
              {pendingCount ? (
                <span className="agenda-calendar-pending" title={`${pendingCount} aguardando confirmação`}>
                  {pendingCount > 1 ? pendingCount : ''}
                </span>
              ) : null}
            </Link>
          )
        })}
      </div>
    </section>
  )
}

function AgendaDateControls({
  date,
  canCreateManual,
  isCreatingManual,
  onCreateManual,
  onDateChange,
  pendingDates,
}: {
  date: string
  canCreateManual: boolean
  isCreatingManual: boolean
  onCreateManual: () => void
  onDateChange: () => void
  pendingDates: Array<{ date: string; count: number }>
}) {
  const [calendarOpen, setCalendarOpen] = useState(false)
  const previousDate = addDays(date, -1)
  const nextDate = addDays(date, 1)
  const today = todayDateOnly()
  const pendingCount = pendingDates.reduce((total, item) => total + item.count, 0)

  return (
    <div className="agenda-date-controls" aria-label="Escolher data da agenda">
      <Link className="secondary-button compact-button" href={`/gestor/agenda?date=${previousDate}`}>
        Dia anterior
      </Link>
      <Link className="secondary-button compact-button" href={`/gestor/agenda?date=${today}`}>
        Hoje
      </Link>
      <Link className="secondary-button compact-button" href={`/gestor/agenda?date=${nextDate}`}>
        Proximo dia
      </Link>
      <div className="agenda-date-form">
        <label htmlFor="agenda-date">Data</label>
        <button
          aria-controls="agenda-month-calendar"
          aria-expanded={calendarOpen}
          className="agenda-date-picker"
          id="agenda-date"
          type="button"
          onClick={() => {
            onDateChange()
            setCalendarOpen((open) => !open)
          }}
        >
          <span>{formatNumericDate(date)}</span>
          <span className="agenda-date-picker-icon" aria-hidden="true">
            <CalendarIcon />
            {pendingCount > 0 ? (
              <i className="agenda-date-picker-badge">
                {pendingCount > 9 ? '9+' : pendingCount}
              </i>
            ) : null}
          </span>
        </button>
        {canCreateManual && !isCreatingManual ? (
          <button className="primary-button compact-button" type="button" onClick={onCreateManual}>
            Agendar
          </button>
        ) : null}
      </div>
      {calendarOpen ? (
        <div className="agenda-calendar-popover" id="agenda-month-calendar">
          <AgendaMonthCalendar date={date} pendingDates={pendingDates} />
        </div>
      ) : null}
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg fill="none" viewBox="0 0 24 24">
      <path
        d="M7 3v3m10-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1Zm3 8h2m2 0h2m2 0h1m-9 4h2m2 0h2"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.7"
      />
    </svg>
  )
}

function AgendaItem({ appointment, user }: { appointment: ManagerAppointment; user: InternalUser }) {
  const markable = canMarkAttendance(appointment.status)
  const canConfirmAttendance = hasPermission(user, 'agenda.mark_attendance')
  const canCancel = hasPermission(user, 'agenda.cancel')
  const canDeleteCancelled =
    hasPermission(user, 'agenda.delete') && appointment.status === 'CANCELADO'

  return (
    <article className="agenda-item">
      <div className="agenda-time">
        <strong>{formatTime(appointment.startAt)}</strong>
        <span>{formatTime(appointment.endAt)}</span>
      </div>
      <div className="agenda-main-info">
        <div>
          <h2>
            {appointment.faithfulName} {appointment.faithfulLastName}
          </h2>
          <p>Atendimento #{appointment.sequenceNumber}</p>
        </div>
        <span className={`status-pill status-${appointment.status.toLowerCase()}`}>{statusLabel(appointment.status)}</span>
      </div>
      <dl className="agenda-meta">
        <div>
          <dt>Telefone</dt>
          <dd>{appointment.faithfulPhone}</dd>
        </div>
        <div>
          <dt>Padre</dt>
          <dd>{appointment.priest.name}</dd>
        </div>
      </dl>
      {markable && (canConfirmAttendance || canCancel) ? (
        <ManagerAgendaActions
          appointmentId={appointment.id}
          appointmentStartAt={appointment.startAt}
          canCancel={canCancel}
          canConfirmAttendance={canConfirmAttendance}
        />
      ) : null}
      {canDeleteCancelled ? <DeleteCancelledAppointmentAction appointmentId={appointment.id} /> : null}
    </article>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="agenda-summary-item">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function canMarkAttendance(status: ManagerAppointment['status']) {
  return status === 'AGENDADO' || status === 'PENDENTE_CONFIRMACAO'
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
  }).format(new Date(`${date}T12:00:00`))
}

function formatNumericDate(date: string) {
  const [year, month, day] = date.split('-')
  return `${day}/${month}/${year}`
}

function addDays(date: string, days: number) {
  const parsed = new Date(`${date}T12:00:00`)
  parsed.setDate(parsed.getDate() + days)
  return dateOnly(parsed)
}

function todayDateOnly() {
  return dateOnly(new Date())
}

function dateOnly(date: Date) {
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')

  return `${year}-${month}-${day}`
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

function statusLabel(status: ManagerAppointment['status']) {
  const labels = {
    AGENDADO: 'Agendado',
    CANCELADO: 'Cancelado',
    PENDENTE_CONFIRMACAO: 'Pendente',
    REALIZADO: 'Realizado',
    AUSENTE: 'Ausente',
  }

  return labels[status]
}

function roleLabel(role: InternalUser['role']) {
  const labels = {
    ADMIN: 'Admin',
    SECRETARIA: 'Secretaria',
    PADRE: 'Padre',
  }

  return labels[role]
}
