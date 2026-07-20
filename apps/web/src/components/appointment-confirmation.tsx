'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { ConfirmedAppointment, formatDateLong, formatTime } from '@/lib/public-api'

const CONFIRMATION_MESSAGE =
  'Guarde este código em um local seguro.\nEle será necessário para consultar, alterar ou cancelar seu agendamento.'

export function AppointmentConfirmation() {
  const [confirmation, setConfirmation] = useState<ConfirmedAppointment | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const raw = sessionStorage.getItem('sasf_confirmation')
    if (!raw) return

    try {
      setConfirmation(JSON.parse(raw) as ConfirmedAppointment)
    } catch {
      setConfirmation(null)
    }
  }, [])

  async function copyCode() {
    if (!confirmation?.code) return
    await navigator.clipboard.writeText(confirmation.code)
    setCopied(true)
  }

  if (!confirmation) {
    return (
      <div className="simple-page">
        <section className="flow-panel">
          <h2>Nenhuma confirmacao recente encontrada.</h2>
          <p className="helper-text">Se voce ja tem um codigo, consulte seu agendamento pela tela de consulta.</p>
          <div className="link-list">
            <Link href="/consultar">Consultar com codigo <span aria-hidden="true">&gt;</span></Link>
            <Link href="/agendar">Fazer agendamento <span aria-hidden="true">&gt;</span></Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <div className="simple-page">
      <section className="flow-panel">
        <div className="section-heading">
          <div>
            <h2>Agendamento confirmado</h2>
            <p>{CONFIRMATION_MESSAGE}</p>
          </div>
        </div>

        <div className="code-box">
          <span className="code-value">{confirmation.code}</span>
        </div>

        <div className="print-actions">
          <button className="primary-button" type="button" onClick={copyCode}>
            {copied ? 'Codigo copiado' : 'Copiar codigo'}
          </button>
          <button className="secondary-button" type="button" onClick={() => window.print()}>
            Imprimir comprovante
          </button>
        </div>

        <div className="appointment-summary">
          <div className="summary-row">
            <span>Dia</span>
            <strong>{formatDateLong(confirmation.appointment.startAt)}</strong>
          </div>
          <div className="summary-row">
            <span>Horario</span>
            <strong>{formatTime(confirmation.appointment.startAt)}</strong>
          </div>
          <div className="summary-row">
            <span>Numero</span>
            <strong>{confirmation.appointment.sequenceNumber}</strong>
          </div>
        </div>
      </section>

      <aside className="side-panel receipt">
        <h2>Comprovante simples</h2>
        <div className="appointment-summary">
          <div className="summary-row">
            <span>Codigo</span>
            <strong>{confirmation.code}</strong>
          </div>
          <div className="summary-row">
            <span>Dia</span>
            <strong>{formatDateLong(confirmation.appointment.startAt)}</strong>
          </div>
          <div className="summary-row">
            <span>Horario</span>
            <strong>{formatTime(confirmation.appointment.startAt)}</strong>
          </div>
        </div>
        <p className="helper-text">{CONFIRMATION_MESSAGE}</p>
        <div className="link-list">
          <Link href="/consultar">Consultar ou cancelar <span aria-hidden="true">&gt;</span></Link>
        </div>
      </aside>
    </div>
  )
}
