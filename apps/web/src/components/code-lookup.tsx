'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { formatDateLong, formatTime, LookupResponse, PublicAppointment, requestJson } from '@/lib/public-api'

export function CodeLookup() {
  const [code, setCode] = useState('')
  const [appointment, setAppointment] = useState<PublicAppointment | null>(null)
  const [loading, setLoading] = useState(false)
  const [canceling, setCanceling] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  async function lookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')
    setAppointment(null)
    const normalizedCode = code.trim()

    try {
      const result = await requestJson<LookupResponse>('/api/public/appointments/lookup', {
        method: 'POST',
        body: JSON.stringify({ code: normalizedCode }),
      })
      setCode(normalizedCode)
      setAppointment(result.appointment)
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel consultar agora.')
    } finally {
      setLoading(false)
    }
  }

  async function cancelAppointment() {
    if (!code || !appointment) return

    setCanceling(true)
    setError('')
    setMessage('')

    try {
      await requestJson<{ ok: true }>(`/api/public/appointments/${encodeURIComponent(code.trim())}`, {
        method: 'DELETE',
      })
      setAppointment(null)
      setCode('')
      setMessage('Agendamento cancelado. Se precisar, voce pode fazer um novo agendamento.')
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel cancelar agora.')
    } finally {
      setCanceling(false)
    }
  }

  return (
    <div className="simple-page">
      <section className="flow-panel">
        <div className="section-heading">
          <div>
            <h2>Consultar por codigo</h2>
            <p>Use o codigo privado recebido na confirmacao.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={lookup}>
          <div className="field">
            <label htmlFor="code">Codigo privado</label>
            <input
              id="code"
              required
              autoComplete="off"
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Consultando...' : 'Consultar'}
          </button>
        </form>

        {appointment ? (
          <AppointmentResult
            appointment={appointment}
            canceling={canceling}
            onCancel={cancelAppointment}
          />
        ) : null}

        {message ? <div className="status-box ok">{message}</div> : null}
        {error ? <div className="status-box error">{error}</div> : null}
        <div className="back-action">
          <Link className="secondary-button compact-button back-arrow-button" aria-label="Voltar" href="/agendar">
            ←
          </Link>
        </div>
      </section>

      <aside className="side-panel">
        <h2>Seu codigo protege seus dados</h2>
        <p className="helper-text">Nao e necessario criar conta. Sem o codigo, nao mostramos dados do agendamento.</p>
        <div className="link-list">
          <a href="/recuperar-codigo">Esqueci meu codigo <span aria-hidden="true">&gt;</span></a>
          <a href="/agendar">Fazer novo agendamento <span aria-hidden="true">&gt;</span></a>
        </div>
      </aside>
    </div>
  )
}

function AppointmentResult({
  appointment,
  canceling,
  onCancel,
}: {
  appointment: PublicAppointment
  canceling: boolean
  onCancel: () => void
}) {
  return (
    <div className="appointment-summary">
      <div className="summary-row">
        <span>Dia</span>
        <strong>{formatDateLong(appointment.startAt)}</strong>
      </div>
      <div className="summary-row">
        <span>Horario</span>
        <strong>{formatTime(appointment.startAt)}</strong>
      </div>
      <div className="summary-row">
        <span>Status</span>
        <strong>{formatStatus(appointment.status)}</strong>
      </div>
      <div className="status-box warning">
        O cancelamento pelo codigo respeita o prazo configurado pela secretaria. Se nao for possivel cancelar aqui,
        procure a secretaria.
      </div>
      <button className="secondary-button" type="button" disabled={canceling} onClick={onCancel}>
        {canceling ? 'Cancelando...' : 'Cancelar agendamento'}
      </button>
    </div>
  )
}

function formatStatus(status: string) {
  const labels: Record<string, string> = {
    AGENDADO: 'Agendado',
    PENDENTE_CONFIRMACAO: 'Pendente de confirmacao',
    REALIZADO: 'Realizado',
    AUSENTE: 'Ausente',
    CANCELADO: 'Cancelado',
  }

  return labels[status] ?? status
}
