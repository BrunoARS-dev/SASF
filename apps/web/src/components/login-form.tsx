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
  const [showPassword, setShowPassword] = useState(false)
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
        <div className="password-input-wrap">
          <input
            id="password"
            autoComplete="current-password"
            required
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            className="password-visibility-button"
            type="button"
            aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            aria-pressed={showPassword}
            title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
            onClick={() => setShowPassword((current) => !current)}
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
      </div>
      <button className="primary-button" type="submit" disabled={submitting}>
        {submitting ? 'Entrando...' : 'Entrar'}
      </button>
      {error ? <div className="status-box error">{error}</div> : null}
    </form>
  )
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M2.8 12s3.4-5.5 9.2-5.5 9.2 5.5 9.2 5.5-3.4 5.5-9.2 5.5S2.8 12 2.8 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="2.7" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="m4 4 16 16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      <path
        d="M9.1 6.9A9.9 9.9 0 0 1 12 6.5c5.8 0 9.2 5.5 9.2 5.5a16.6 16.6 0 0 1-2.4 3M14.8 17.1a9.8 9.8 0 0 1-2.8.4C6.2 17.5 2.8 12 2.8 12a16.2 16.2 0 0 1 2.5-3.1M10.1 10.1a2.7 2.7 0 0 0 3.8 3.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
