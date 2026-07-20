'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useState } from 'react'
import type { FormEvent } from 'react'

export function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get('next') ?? '/gestor'
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      })

      if (!response.ok) {
        setError('Nao foi possivel entrar. Confira usuario/e-mail e senha.')
        return
      }

      router.replace(next.startsWith('/gestor') ? next : '/gestor')
      router.refresh()
    } catch {
      setError('Nao foi possivel conectar agora. Tente novamente em alguns minutos.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="form-grid" onSubmit={submit}>
      <div className="field">
        <label htmlFor="identifier">Usuario ou e-mail</label>
        <input
          id="identifier"
          autoComplete="username"
          required
          value={identifier}
          onChange={(event) => setIdentifier(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Senha</label>
        <input
          id="password"
          autoComplete="current-password"
          required
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </div>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
      {error ? <div className="status-box error">{error}</div> : null}
    </form>
  )
}
