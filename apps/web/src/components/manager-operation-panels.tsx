'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import type { HTMLAttributes, ReactNode } from 'react'
import type {
  ManagerAvailability,
  ManagerBlockedSlot,
  ManagerPriest,
  ManagerQrCode,
  ManagerSetting,
} from '@/lib/manager-api'

const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

export function ManualAppointmentPanel({ priests, onCancel }: { priests: ManagerPriest[]; onCancel: () => void }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createManual(formData: FormData) {
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/internal/appointments/manual', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          faithfulName: String(formData.get('faithfulName') ?? ''),
          faithfulLastName: String(formData.get('faithfulLastName') ?? ''),
          faithfulPhone: String(formData.get('faithfulPhone') ?? ''),
          startAt: String(formData.get('startAt') ?? ''),
          priestId: String(formData.get('priestId') ?? '') || undefined,
        }),
      })

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setError(typeof data?.message === 'string' ? data.message : 'Nao foi possivel salvar agora.')
        return
      }

      router.refresh()
      onCancel()
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Nao foi possivel salvar agora.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ManagerCrud title="Inclusao manual" description="Crie um encaixe pela secretaria ou administracao.">
      <form className="manager-form-grid" action={createManual}>
        <Field name="faithfulName" label="Nome" required />
        <Field name="faithfulLastName" label="Ultimo sobrenome" required />
        <Field name="faithfulPhone" label="Telefone" type="tel" inputMode="tel" required />
        <Field name="startAt" label="Data e hora" type="datetime-local" required />
        <PriestSelect priests={priests} />
        <div className="manager-form-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? 'Salvando...' : 'Criar agendamento manual'}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={loading}
            onClick={() => {
              setError('')
              onCancel()
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
      <ErrorText message={error} />
    </ManagerCrud>
  )
}

export function PriestsPanel({ priests }: { priests: ManagerPriest[] }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createPriest(formData: FormData) {
    await submitJson('/api/internal/priests', 'POST', formDataToObject(formData), setLoading, setError, router.refresh)
  }

  return (
    <ManagerCrud title="Padres" description="Cadastre e mantenha padres ativos para a agenda.">
      <form className="manager-form-grid" action={createPriest}>
        <Field name="name" label="Nome" required />
        <Field name="username" label="Usuario" required />
        <Field name="email" label="E-mail" type="email" required />
        <Field name="password" label="Senha inicial" type="password" required />
        <Field name="appointmentDurationMin" label="Duracao por atendimento (min)" type="number" />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Adicionar padre'}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {priests.map((priest) => (
          <EditablePriest key={priest.id} priest={priest} />
        ))}
      </div>
    </ManagerCrud>
  )
}

function EditablePriest({ priest }: { priest: ManagerPriest }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function update(formData: FormData) {
    await submitJson(
      `/api/internal/priests/${priest.id}`,
      'PATCH',
      {
        name: String(formData.get('name') ?? ''),
        appointmentDurationMin: numberOrUndefined(formData.get('appointmentDurationMin')),
        active: formData.get('active') === 'on',
      },
      setLoading,
      setError,
      router.refresh,
    )
  }

  async function remove() {
    await submitJson(`/api/internal/priests/${priest.id}`, 'DELETE', null, setLoading, setError, router.refresh)
  }

  return (
    <article className="manager-list-item">
      <form className="manager-inline-form" action={update}>
        <div>
          <strong>{priest.name}</strong>
          <span>{priest.user.username} · {priest.user.email}</span>
        </div>
        <input name="name" defaultValue={priest.name} aria-label="Nome do padre" />
        <input
          name="appointmentDurationMin"
          defaultValue={priest.appointmentDurationMin ?? ''}
          inputMode="numeric"
          aria-label="Duracao"
        />
        <label className="check-row">
          <input name="active" type="checkbox" defaultChecked={priest.active} /> Ativo
        </label>
        <button className="secondary-button compact-button" disabled={loading} type="submit">Salvar</button>
        <button className="quiet-danger-button compact-button" disabled={loading} type="button" onClick={remove}>Remover</button>
      </form>
      <ErrorText message={error} />
    </article>
  )
}

export function AvailabilitiesPanel({
  priests,
  availabilities,
}: {
  priests: ManagerPriest[]
  availabilities: ManagerAvailability[]
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createAvailability(formData: FormData) {
    await submitJson('/api/internal/availabilities', 'POST', formDataToObject(formData), setLoading, setError, router.refresh)
  }

  return (
    <ManagerCrud title="Disponibilidades" description="Defina os intervalos recorrentes em que cada padre atende.">
      <form className="manager-form-grid" action={createAvailability}>
        <PriestSelect priests={priests} />
        <WeekdaySelect />
        <Field name="startTime" label="Inicio" type="time" required />
        <Field name="endTime" label="Fim" type="time" required />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Adicionar disponibilidade'}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {availabilities.map((availability) => (
          <EditableAvailability key={availability.id} availability={availability} />
        ))}
      </div>
    </ManagerCrud>
  )
}

function EditableAvailability({ availability }: { availability: ManagerAvailability }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function update(formData: FormData) {
    await submitJson(
      `/api/internal/availabilities/${availability.id}`,
      'PATCH',
      {
        dayOfWeek: Number(formData.get('dayOfWeek')),
        startTime: String(formData.get('startTime') ?? ''),
        endTime: String(formData.get('endTime') ?? ''),
        active: formData.get('active') === 'on',
      },
      setLoading,
      setError,
      router.refresh,
    )
  }

  async function remove() {
    await submitJson(`/api/internal/availabilities/${availability.id}`, 'DELETE', null, setLoading, setError, router.refresh)
  }

  return (
    <article className="manager-list-item">
      <form className="manager-inline-form" action={update}>
        <div>
          <strong>{availability.priest.name}</strong>
          <span>{weekdays[availability.dayOfWeek]} · {availability.startTime} - {availability.endTime}</span>
        </div>
        <select name="dayOfWeek" defaultValue={availability.dayOfWeek} aria-label="Dia da semana">
          {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
        </select>
        <input name="startTime" type="time" defaultValue={availability.startTime} aria-label="Inicio" />
        <input name="endTime" type="time" defaultValue={availability.endTime} aria-label="Fim" />
        <label className="check-row">
          <input name="active" type="checkbox" defaultChecked={availability.active} /> Ativa
        </label>
        <button className="secondary-button compact-button" disabled={loading} type="submit">Salvar</button>
        <button className="quiet-danger-button compact-button" disabled={loading} type="button" onClick={remove}>Remover</button>
      </form>
      <ErrorText message={error} />
    </article>
  )
}

export function BlockedSlotsPanel({
  priests,
  blockedSlots,
}: {
  priests: ManagerPriest[]
  blockedSlots: ManagerBlockedSlot[]
}) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function createBlockedSlot(formData: FormData) {
    await submitJson(
      '/api/internal/blocked-slots',
      'POST',
      {
        priestId: String(formData.get('priestId') ?? ''),
        startAt: localDateTimeToIso(formData.get('startAt')),
        endAt: localDateTimeToIso(formData.get('endAt')),
        operationalReason: String(formData.get('operationalReason') ?? ''),
      },
      setLoading,
      setError,
      router.refresh,
    )
  }

  return (
    <ManagerCrud title="Bloqueios" description="Registre indisponibilidades operacionais sem expor motivo ao fiel.">
      <form className="manager-form-grid" action={createBlockedSlot}>
        <PriestSelect priests={priests} />
        <Field name="startAt" label="Inicio" type="datetime-local" required />
        <Field name="endAt" label="Fim" type="datetime-local" required />
        <Field name="operationalReason" label="Motivo operacional" />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? 'Salvando...' : 'Adicionar bloqueio'}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {blockedSlots.map((slot) => (
          <BlockedSlotRow key={slot.id} blockedSlot={slot} />
        ))}
      </div>
    </ManagerCrud>
  )
}

function BlockedSlotRow({ blockedSlot }: { blockedSlot: ManagerBlockedSlot }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function toggleActive() {
    await submitJson(
      `/api/internal/blocked-slots/${blockedSlot.id}`,
      'PATCH',
      { active: !blockedSlot.active },
      setLoading,
      setError,
      router.refresh,
    )
  }

  async function remove() {
    await submitJson(`/api/internal/blocked-slots/${blockedSlot.id}`, 'DELETE', null, setLoading, setError, router.refresh)
  }

  return (
    <article className="manager-list-item">
      <div className="manager-row">
        <div>
          <strong>{blockedSlot.priest.name}</strong>
          <span>{formatDateTime(blockedSlot.startAt)} - {formatDateTime(blockedSlot.endAt)}</span>
          {blockedSlot.operationalReason ? <small>{blockedSlot.operationalReason}</small> : null}
        </div>
        <button className="secondary-button compact-button" disabled={loading} type="button" onClick={toggleActive}>
          {blockedSlot.active ? 'Desativar' : 'Ativar'}
        </button>
        <button className="quiet-danger-button compact-button" disabled={loading} type="button" onClick={remove}>Remover</button>
      </div>
      <ErrorText message={error} />
    </article>
  )
}

export function SettingsPanel({ settings }: { settings: ManagerSetting[] }) {
  return (
    <ManagerCrud title="Configuracoes" description="Ajuste parametros operacionais validados pelo backend.">
      <div className="manager-list">
        {settings.map((setting) => (
          <SettingRow key={setting.key} setting={setting} />
        ))}
      </div>
    </ManagerCrud>
  )
}

function SettingRow({ setting }: { setting: ManagerSetting }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function update(formData: FormData) {
    await submitJson(
      '/api/internal/settings',
      'PATCH',
      { key: setting.key, value: String(formData.get('value') ?? '') },
      setLoading,
      setError,
      router.refresh,
    )
  }

  return (
    <article className="manager-list-item">
      <form className="manager-inline-form" action={update}>
        <div>
          <strong>{setting.key}</strong>
          <span>{setting.description ?? setting.valueType}</span>
        </div>
        {setting.valueType === 'BOOLEAN' ? (
          <select name="value" defaultValue={setting.value} aria-label={setting.key}>
            <option value="true">Sim</option>
            <option value="false">Nao</option>
          </select>
        ) : (
          <input name="value" defaultValue={setting.value} inputMode={setting.valueType === 'INTEGER' ? 'numeric' : 'text'} />
        )}
        <button className="secondary-button compact-button" disabled={loading} type="submit">Salvar</button>
      </form>
      <ErrorText message={error} />
    </article>
  )
}

export function QrCodePanel({ qrCode }: { qrCode: ManagerQrCode | null }) {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function generate() {
    await submitJson('/api/internal/qr-codes', 'POST', {}, setLoading, setError, router.refresh)
  }

  return (
    <ManagerCrud title="QR Code publico" description="Mantenha o link publico de agendamento versionado.">
      <div className="qr-panel">
        <div className="qr-box" aria-hidden="true">
          <span>QR</span>
        </div>
        <div className="qr-details">
          <strong>{qrCode ? `Versao ${qrCode.version}` : 'Nenhum QR ativo'}</strong>
          <span>{qrCode?.url ?? 'Gere uma versao para publicar o acesso publico.'}</span>
          {qrCode ? <a className="secondary-button compact-button" href={qrCode.url} target="_blank">Abrir link</a> : null}
          <button className="primary-button" type="button" disabled={loading} onClick={generate}>
            {loading ? 'Gerando...' : 'Gerar nova versao'}
          </button>
        </div>
      </div>
      <ErrorText message={error} />
    </ManagerCrud>
  )
}

function ManagerCrud({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <div className="manager-empty operation-panel">{children}</div>
    </div>
  )
}

function Field({
  name,
  label,
  type = 'text',
  required = false,
  inputMode,
}: {
  name: string
  label: string
  type?: string
  required?: boolean
  inputMode?: HTMLAttributes<HTMLInputElement>['inputMode']
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input id={name} name={name} type={type} inputMode={inputMode} required={required} />
    </div>
  )
}

function PriestSelect({ priests }: { priests: ManagerPriest[] }) {
  return (
    <div className="field">
      <label htmlFor="priestId">Padre</label>
      <select id="priestId" name="priestId" required>
        {priests.filter((priest) => priest.active).map((priest) => (
          <option key={priest.id} value={priest.id}>{priest.name}</option>
        ))}
      </select>
    </div>
  )
}

function WeekdaySelect() {
  return (
    <div className="field">
      <label htmlFor="dayOfWeek">Dia</label>
      <select id="dayOfWeek" name="dayOfWeek" defaultValue="1" required>
        {weekdays.map((day, index) => <option key={day} value={index}>{day}</option>)}
      </select>
    </div>
  )
}

function ErrorText({ message }: { message: string }) {
  return message ? <div className="status-box error">{message}</div> : null
}

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries())
}

async function submitJson(
  url: string,
  method: string,
  payload: Record<string, unknown> | null,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  refresh: () => void,
) {
  setLoading(true)
  setError('')

  try {
    const response = await fetch(url, {
      method,
      headers: payload ? { 'Content-Type': 'application/json' } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })

    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setError(typeof data?.message === 'string' ? data.message : 'Nao foi possivel salvar agora.')
      return
    }

    refresh()
  } catch {
    setError('Nao foi possivel conectar agora.')
  } finally {
    setLoading(false)
  }
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

function localDateTimeToIso(value: FormDataEntryValue | null) {
  return new Date(String(value ?? '')).toISOString()
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}
