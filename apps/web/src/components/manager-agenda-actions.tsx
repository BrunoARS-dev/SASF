'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

type AgendaAction = 'realized' | 'absent' | 'cancel' | 'edit'

export function ManagerAgendaActions({
  appointmentId,
  appointmentStartAt,
  canCancel = false,
}: {
  appointmentId: string
  appointmentStartAt: string
  canCancel?: boolean
}) {
  const router = useRouter()
  const [pendingAction, setPendingAction] = useState<AgendaAction | null>(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [editStartAt, setEditStartAt] = useState(() => toDateTimeLocalValue(appointmentStartAt))
  const [now, setNow] = useState<number | null>(null)
  const appointmentStartTime = new Date(appointmentStartAt).getTime()
  const isFuture = now !== null && appointmentStartTime > now
  const attendanceAvailable = now !== null && appointmentStartTime <= now

  useEffect(() => {
    setNow(Date.now())
    const interval = window.setInterval(() => setNow(Date.now()), 30000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    setEditStartAt(toDateTimeLocalValue(appointmentStartAt))
  }, [appointmentStartAt])

  async function markAttendance(action: 'realized' | 'absent') {
    if (!attendanceAvailable) {
      setError('Realizado e ausente so ficam disponiveis a partir do horario agendado.')
      return
    }

    setPendingAction(action)
    setError('')

    try {
      const response = await fetch(`/api/internal/appointments/${appointmentId}/attendance/${action}`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        setError('Nao foi possivel atualizar este atendimento agora.')
        return
      }

      router.refresh()
    } catch {
      setError('Nao foi possivel conectar agora.')
    } finally {
      setPendingAction(null)
    }
  }

  async function cancelAppointment() {
    const confirmed = window.confirm('Cancelar este agendamento? Esta acao libera o horario para outro fiel.')
    if (!confirmed) return

    setPendingAction('cancel')
    setError('')

    try {
      const response = await fetch(`/api/internal/appointments/${appointmentId}/cancel`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        setError('Nao foi possivel cancelar este agendamento agora.')
        return
      }

      router.refresh()
    } catch {
      setError('Nao foi possivel conectar agora.')
    } finally {
      setPendingAction(null)
    }
  }

  async function rescheduleAppointment() {
    if (!isFuture) {
      setEditing(false)
      return
    }

    setPendingAction('edit')
    setError('')

    try {
      const response = await fetch(`/api/internal/appointments/${appointmentId}/reschedule`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startAt: editStartAt,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.message === 'string' ? data.message : 'Nao foi possivel editar este atendimento agora.')
        return
      }

      setEditing(false)
      router.refresh()
    } catch {
      setError('Nao foi possivel conectar agora.')
    } finally {
      setPendingAction(null)
    }
  }

  return (
    <div className="agenda-actions">
      {editing && isFuture ? (
        <form
          className="agenda-edit-form"
          onSubmit={(event) => {
            event.preventDefault()
            rescheduleAppointment()
          }}
        >
          <label htmlFor={`appointment-${appointmentId}-start`}>Novo horario</label>
          <input
            id={`appointment-${appointmentId}-start`}
            type="datetime-local"
            value={editStartAt}
            onChange={(event) => setEditStartAt(event.target.value)}
            required
          />
          <button className="secondary-button compact-button" type="submit" disabled={pendingAction !== null}>
            {pendingAction === 'edit' ? 'Salvando...' : 'Salvar'}
          </button>
          <button
            className="quiet-button compact-button"
            type="button"
            disabled={pendingAction !== null}
            onClick={() => {
              setEditStartAt(toDateTimeLocalValue(appointmentStartAt))
              setEditing(false)
              setError('')
            }}
          >
            Cancelar edicao
          </button>
        </form>
      ) : null}
      {attendanceAvailable ? (
        <>
          <button
            className="secondary-button compact-button"
            type="button"
            disabled={pendingAction !== null}
            onClick={() => markAttendance('realized')}
          >
            {pendingAction === 'realized' ? 'Salvando...' : 'Realizado'}
          </button>
          <button
            className="quiet-danger-button compact-button"
            type="button"
            disabled={pendingAction !== null}
            onClick={() => markAttendance('absent')}
          >
            {pendingAction === 'absent' ? 'Salvando...' : 'Ausente'}
          </button>
        </>
      ) : null}
      {isFuture && canCancel && !editing ? (
        <button
          className="secondary-button compact-button"
          type="button"
          disabled={pendingAction !== null}
          onClick={() => {
            setError('')
            setEditing(true)
          }}
        >
          Editar
        </button>
      ) : null}
      {isFuture && canCancel ? (
        <button
          className="quiet-danger-button compact-button"
          type="button"
          disabled={pendingAction !== null}
          onClick={cancelAppointment}
        >
          {pendingAction === 'cancel' ? 'Cancelando...' : 'Cancelar'}
        </button>
      ) : null}
      {error ? <span className="agenda-action-error">{error}</span> : null}
    </div>
  )
}

export function DeleteCancelledAppointmentAction({ appointmentId }: { appointmentId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function deleteAppointment() {
    const confirmed = window.confirm('Excluir este agendamento cancelado?')
    if (!confirmed) return

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/internal/appointments/${appointmentId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        setError('Nao foi possivel excluir este agendamento agora.')
        return
      }

      router.refresh()
    } catch {
      setError('Nao foi possivel conectar agora.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="agenda-actions">
      <button className="quiet-danger-button compact-button" type="button" disabled={loading} onClick={deleteAppointment}>
        {loading ? 'Excluindo...' : 'Excluir'}
      </button>
      {error ? <span className="agenda-action-error">{error}</span> : null}
    </div>
  )
}

function toDateTimeLocalValue(value: string) {
  const date = new Date(value)
  const year = date.getFullYear()
  const month = (date.getMonth() + 1).toString().padStart(2, '0')
  const day = date.getDate().toString().padStart(2, '0')
  const hour = date.getHours().toString().padStart(2, '0')
  const minute = date.getMinutes().toString().padStart(2, '0')

  return `${year}-${month}-${day}T${hour}:${minute}`
}
