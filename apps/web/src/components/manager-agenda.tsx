'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { ManualAppointmentPanel } from '@/components/manager-operation-panels'
import { DeleteCancelledAppointmentAction, ManagerAgendaActions } from '@/components/manager-agenda-actions'
import type { InternalUser } from '@/lib/auth'
import type { ManagerAgendaDay, ManagerAppointment, ManagerPriest } from '@/lib/manager-api'

export function ManagerAgenda({
  user,
  date,
  agenda,
  priests,
}: {
  user: InternalUser
  date: string
  agenda: ManagerAgendaDay
  priests?: ManagerPriest[]
}) {
  const formattedDate = formatDate(date)
  const pendingCount = agenda.items.filter((item) => canMarkAttendance(item.status)).length
  const canCreateManual = user.role === 'ADMIN' || user.role === 'SECRETARIA'
  const [isCreatingManual, setIsCreatingManual] = useState(false)

  return (
    <div className="manager-content">
      <section className="manager-title">
        <p className="manager-eyebrow">Agenda</p>
        <h1>{formattedDate}</h1>
        <p>
          {user.role === 'PADRE'
            ? 'Mostrando apenas os atendimentos vinculados ao seu perfil.'
            : 'Mostrando os atendimentos de todos os padres.'}
        </p>
      </section>

      <AgendaDateControls
        date={date}
        canCreateManual={canCreateManual}
        isCreatingManual={isCreatingManual}
        onCreateManual={() => setIsCreatingManual(true)}
        onDateChange={() => setIsCreatingManual(false)}
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
          <p>Quando houver agendamentos para esta data, eles aparecerao aqui.</p>
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

function AgendaDateControls({
  date,
  canCreateManual,
  isCreatingManual,
  onCreateManual,
  onDateChange,
}: {
  date: string
  canCreateManual: boolean
  isCreatingManual: boolean
  onCreateManual: () => void
  onDateChange: () => void
}) {
  const router = useRouter()
  const previousDate = addDays(date, -1)
  const nextDate = addDays(date, 1)
  const today = todayDateOnly()

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
        <input
          id="agenda-date"
          name="date"
          type="date"
          defaultValue={date}
          onChange={(event) => {
            if (!event.target.value) {
              return
            }

            onDateChange()
            router.push(`/gestor/agenda?date=${event.target.value}`)
          }}
        />
        {canCreateManual && !isCreatingManual ? (
          <button className="secondary-button compact-button" type="button" onClick={onCreateManual}>
            Agendar
          </button>
        ) : null}
      </div>
    </div>
  )
}

function AgendaItem({ appointment, user }: { appointment: ManagerAppointment; user: InternalUser }) {
  const markable = canMarkAttendance(appointment.status)
  const canCancel = user.role === 'ADMIN' || user.role === 'SECRETARIA'
  const canDeleteCancelled = canCancel && appointment.status === 'CANCELADO'

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
      {markable ? (
        <ManagerAgendaActions
          appointmentId={appointment.id}
          appointmentStartAt={appointment.startAt}
          canCancel={canCancel}
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
