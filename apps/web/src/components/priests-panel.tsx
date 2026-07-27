"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import type { ManagerPriest, UnlinkedPriestUser } from "@/lib/manager-api"
import { ConfirmationAlert, SuccessAlert } from "./ui-feedback"

export function PriestsPanel({
  priests,
  unlinkedUsers,
  canManage,
  canDelete,
}: {
  priests: ManagerPriest[]
  unlinkedUsers: UnlinkedPriestUser[]
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function create(formData: FormData) {
    await submit("/api/internal/priests", "POST", {
      name: String(formData.get("name") ?? ""),
      appointmentDurationMin: numberOrUndefined(formData.get("appointmentDurationMin")),
      userId: String(formData.get("userId") ?? "") || undefined,
      active: true,
    }, setLoading, setError, router.refresh)
  }

  async function createFromUser(user: UnlinkedPriestUser) {
    await submit("/api/internal/priests", "POST", {
      name: user.name,
      userId: user.id,
      active: true,
    }, setLoading, setError, router.refresh)
  }

  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>Padres</h1>
        <p>Gerencie os perfis que participam da agenda e seus vínculos com contas de acesso.</p>
      </section>

      {canManage && unlinkedUsers.length > 0 ? (
        <section className="manager-empty operation-panel priest-link-section">
          <SectionHeading
            title="Contas aguardando vínculo"
            description="Usuários com função Padre que ainda não possuem perfil operacional."
            count={unlinkedUsers.length}
          />
          <div className="pending-link-list">
            {unlinkedUsers.map((user) => (
              <div className="pending-link-row" key={user.id}>
                <div><strong>{user.name}</strong><span>{user.email}</span></div>
                <span className={user.active ? "access-active" : "access-inactive"}>
                  Acesso {user.active ? "ativo" : "desativado"}
                </span>
                <button className="secondary-button compact-button" disabled={loading} onClick={() => createFromUser(user)} type="button">
                  {user.restorablePriestId ? "Restaurar perfil" : "Criar perfil"}
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {canManage ? (
        <section className="manager-empty operation-panel">
          <SectionHeading title="Adicionar padre" description="A conta de acesso é opcional e pode ser vinculada depois." />
          <form className="manager-form-grid" action={create}>
            <Field name="name" label="Nome exibido na agenda" required />
            <Field name="appointmentDurationMin" label="Duração por atendimento (min)" type="number" />
            <label className="field">
              <span>Conta de acesso</span>
              <select name="userId" defaultValue="">
                <option value="">Nenhuma conta vinculada</option>
                {unlinkedUsers.map((user) => <option value={user.id} key={user.id}>{user.name} · {user.email}</option>)}
              </select>
            </label>
            <button className="primary-button compact-button manager-add-button" disabled={loading} type="submit">
              {loading ? "Salvando..." : "Adicionar"}
            </button>
          </form>
        </section>
      ) : null}

      {error ? <div className="status-box error">{error}</div> : null}

      <section className="manager-empty operation-panel">
        <SectionHeading title="Padres cadastrados" description={`${priests.length} perfis operacionais encontrados.`} />
        <div className="manager-list">
          {priests.map((priest) => (
            <PriestRow
              key={priest.id}
              priest={priest}
              unlinkedUsers={unlinkedUsers}
              canManage={canManage}
              canDelete={canDelete}
            />
          ))}
        </div>
      </section>
    </div>
  )
}

function PriestRow({ priest, unlinkedUsers, canManage, canDelete }: {
  priest: ManagerPriest
  unlinkedUsers: UnlinkedPriestUser[]
  canManage: boolean
  canDelete: boolean
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [changed, setChanged] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  async function update(formData: FormData) {
    const success = await submit(`/api/internal/priests/${priest.id}`, "PATCH", {
      name: String(formData.get("name") ?? ""),
      appointmentDurationMin: numberOrUndefined(formData.get("appointmentDurationMin")),
      userId: String(formData.get("userId") ?? "") || null,
      active: formData.get("active") === "on",
    }, setLoading, setError, router.refresh)
    if (success) { setChanged(false); setSaved(true) }
  }

  async function remove() {
    const success = await submit(`/api/internal/priests/${priest.id}`, "DELETE", null, setLoading, setError, router.refresh)
    if (success) setConfirmDelete(false)
  }

  return (
    <article className="manager-list-item">
      <form className="priest-profile-form" action={update} onInput={() => { setChanged(true); setSaved(false) }}>
        <div className="priest-profile-summary">
          <strong>{priest.name}</strong>
          <span>{priest.user ? `${priest.user.email} · acesso ${priest.user.active ? "ativo" : "desativado"}` : "Sem conta de acesso vinculada"}</span>
        </div>
        <input aria-label="Nome exibido na agenda" defaultValue={priest.name} disabled={!canManage} name="name" />
        <input aria-label="Duração por atendimento" defaultValue={priest.appointmentDurationMin ?? ""} disabled={!canManage} inputMode="numeric" name="appointmentDurationMin" />
        <select aria-label="Conta de acesso vinculada" defaultValue={priest.user?.id ?? ""} disabled={!canManage} name="userId">
          <option value="">Sem conta vinculada</option>
          {priest.user ? <option value={priest.user.id}>{priest.user.name} · {priest.user.email}</option> : null}
          {unlinkedUsers.filter((user) => user.id !== priest.user?.id).map((user) => (
            <option value={user.id} key={user.id}>{user.name} · {user.email}</option>
          ))}
        </select>
        <div className="manager-status-actions">
          <label className="check-row"><input defaultChecked={priest.active} disabled={!canManage} name="active" type="checkbox" />Ativo na agenda</label>
          {canDelete ? <button aria-label="Remover perfil de padre" className="icon-danger-button" disabled={loading} onClick={() => setConfirmDelete(true)} title="Remover perfil" type="button"><TrashIcon /></button> : null}
        </div>
        {canManage ? <button className={`${changed ? "primary-button" : "secondary-button"} compact-button`} disabled={loading} type="submit">{loading ? "Salvando..." : "Salvar"}</button> : null}
      </form>
      {error ? <div className="status-box error">{error}</div> : null}
      {saved ? <SuccessAlert message="Alterações salvas com sucesso." onDismiss={() => setSaved(false)} /> : null}
      <ConfirmationAlert
        open={confirmDelete}
        title={`Remover ${priest.name}?`}
        description="O perfil deixará de participar da agenda. A conta de acesso, se houver, será preservada."
        loading={loading}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={remove}
      />
    </article>
  )
}

function SectionHeading({ title, description, count }: { title: string; description: string; count?: number }) {
  return <div className="operation-section-heading"><div><strong>{title}</strong><p>{description}</p></div>{count ? <span className="attention-count">{count}</span> : null}</div>
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input name={name} required={required} type={type} /></label>
}

function TrashIcon() {
  return <svg aria-hidden="true" fill="none" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" /></svg>
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  if (!String(value ?? "").trim()) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

async function submit(
  url: string,
  method: string,
  payload: Record<string, unknown> | null,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  refresh: () => void,
) {
  setLoading(true); setError("")
  try {
    const response = await fetch(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    })
    if (!response.ok) {
      const data = await response.json().catch(() => null)
      setError(typeof data?.message === "string" ? data.message : "Não foi possível salvar agora.")
      return false
    }
    refresh(); return true
  } catch {
    setError("Não foi possível conectar agora."); return false
  } finally {
    setLoading(false)
  }
}
