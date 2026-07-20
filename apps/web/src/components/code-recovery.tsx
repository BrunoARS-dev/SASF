'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import Link from 'next/link'
import { RecoveryResponse, requestJson } from '@/lib/public-api'

export function CodeRecovery() {
  const [form, setForm] = useState({ faithfulPhone: '', faithfulLastName: '', date: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RecoveryResponse | null>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  async function recover(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setResult(null)
    setCopied(false)

    try {
      const response = await requestJson<RecoveryResponse>('/api/public/code-recovery', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setResult(response)
    } catch {
      setError('Nao foi possivel solicitar a recuperacao agora. Tente novamente em alguns minutos.')
    } finally {
      setLoading(false)
    }
  }

  async function copyCode() {
    if (!result?.code) return
    await navigator.clipboard.writeText(result.code)
    setCopied(true)
  }

  return (
    <div className="simple-page">
      <section className="flow-panel">
        <div className="section-heading">
          <div>
            <h2>Recuperar codigo</h2>
            <p>Informe telefone, ultimo sobrenome e data do agendamento.</p>
          </div>
        </div>
        <form className="form-grid" onSubmit={recover}>
          <div className="field">
            <label htmlFor="faithfulPhone">Telefone</label>
            <input
              id="faithfulPhone"
              inputMode="tel"
              autoComplete="tel"
              required
              value={form.faithfulPhone}
              onChange={(event) => setForm((current) => ({ ...current, faithfulPhone: event.target.value }))}
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
            <label htmlFor="date">Data do agendamento</label>
            <input
              id="date"
              type="date"
              required
              value={form.date}
              onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            />
          </div>
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Verificando...' : 'Recuperar codigo'}
          </button>
        </form>

        {result ? (
          <div className="status-box ok">
            <p>{result.message}</p>
            {result.code ? (
              <div className="code-box">
                <span className="code-value">{result.code}</span>
                <button className="secondary-button" type="button" onClick={copyCode}>
                  {copied ? 'Codigo copiado' : 'Copiar codigo'}
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
        {error ? <div className="status-box error">{error}</div> : null}
        <div className="back-action">
          <Link className="secondary-button compact-button back-arrow-button" aria-label="Voltar" href="/agendar">
            ←
          </Link>
        </div>
      </section>

      <aside className="side-panel">
        <h2>Resposta neutra</h2>
        <p className="helper-text">Por seguranca, a tela nao informa se telefone, nome ou data existem no sistema.</p>
      </aside>
    </div>
  )
}
