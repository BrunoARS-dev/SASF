"use client"

import { useRouter } from "next/navigation"
import { useMemo, useState } from "react"
import type {
  AccessPermission,
  AccessRole,
  ManagerUser,
} from "@/lib/manager-api"
import { SuccessAlert } from "./ui-feedback"

const roleLabels = {
  ADMIN: "Administrador",
  SECRETARIA: "Secretaria",
  PADRE: "Padre",
} as const

export function UsersPanel({
  users,
  roles,
  currentUserId,
}: {
  users: ManagerUser[]
  roles: AccessRole[]
  currentUserId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function create(formData: FormData) {
    await submit("/api/internal/users", "POST", {
      name: String(formData.get("name") ?? ""),
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? ""),
      role: String(formData.get("role") ?? ""),
      active: true,
    }, setLoading, setError, router.refresh)
  }

  return (
    <>
      <section className="manager-empty operation-panel">
        <div className="operation-section-heading">
          <div>
            <strong>Adicionar usuário</strong>
            <p>Crie a conta e atribua a função responsável pelos privilégios.</p>
          </div>
        </div>
        <form className="manager-form-grid user-create-form" action={create}>
          <Field name="name" label="Nome" required />
          <Field name="username" label="Usuário" required />
          <Field name="email" label="E-mail" type="email" required />
          <Field name="password" label="Senha inicial" type="password" required />
          <label className="field">
            <span>Função</span>
            <select name="role" defaultValue="SECRETARIA">
              {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
            </select>
          </label>
          <button className="primary-button compact-button manager-add-button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Adicionar usuário"}
          </button>
        </form>
        {error ? <div className="status-box error">{error}</div> : null}
      </section>

      <section className="manager-empty operation-panel">
        <div className="operation-section-heading">
          <div><strong>Contas cadastradas</strong><p>{users.length} usuários encontrados.</p></div>
        </div>
        <div className="access-user-list">
          {users.map((user) => (
            <UserRow
              key={user.id}
              user={user}
              roles={roles}
              currentUserId={currentUserId}
            />
          ))}
        </div>
      </section>
    </>
  )
}

function UserRow({ user, roles, currentUserId }: {
  user: ManagerUser
  roles: AccessRole[]
  currentUserId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const [changed, setChanged] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)

  async function update(formData: FormData) {
    const success = await submit(`/api/internal/users/${user.id}`, "PATCH", {
      name: String(formData.get("name") ?? ""),
      username: String(formData.get("username") ?? ""),
      email: String(formData.get("email") ?? ""),
      role: String(formData.get("role") ?? ""),
      active: formData.get("active") === "on",
    }, setLoading, setError, router.refresh)
    if (success) { setChanged(false); setSaved(true) }
  }

  async function resetPassword(formData: FormData) {
    const success = await submit(`/api/internal/users/${user.id}/password`, "PATCH", {
      password: String(formData.get("password") ?? ""),
    }, setLoading, setError, router.refresh)
    if (success) { setPasswordOpen(false); setSaved(true) }
  }

  return (
    <article className="access-user-card">
      <form className="access-user-form" action={update} onInput={() => { setChanged(true); setSaved(false) }}>
        <div className="access-user-identity">
          <strong>{user.name}</strong>
          <span>{user.email}</span>
          {user.priestProfile ? <small>Vinculado a {user.priestProfile.name}</small> : null}
        </div>
        <input aria-label="Nome" defaultValue={user.name} name="name" />
        <input aria-label="Usuário" defaultValue={user.username} name="username" />
        <input aria-label="E-mail" defaultValue={user.email} name="email" type="email" />
        <select aria-label="Função" defaultValue={user.role} name="role">
          {roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>)}
        </select>
        <label className="access-toggle">
          {user.id === currentUserId ? (
            <input name="active" type="hidden" value="on" />
          ) : null}
          <input
            defaultChecked={user.active}
            disabled={user.id === currentUserId}
            name={user.id === currentUserId ? undefined : "active"}
            type="checkbox"
          />
          <span>{user.active ? "Acesso ativo" : "Acesso desativado"}</span>
        </label>
        <div className="access-user-actions">
          <button className={`${changed ? "primary-button" : "secondary-button"} compact-button`} disabled={loading} type="submit">
            {loading ? "Salvando..." : "Salvar"}
          </button>
          <button className="quiet-button compact-button" type="button" onClick={() => setPasswordOpen((open) => !open)}>
            Redefinir senha
          </button>
        </div>
      </form>
      {passwordOpen ? (
        <form className="password-reset-form" action={resetPassword}>
          <label className="field"><span>Nova senha</span><input minLength={8} name="password" required type="password" /></label>
          <button className="secondary-button compact-button" disabled={loading} type="submit">Atualizar senha</button>
        </form>
      ) : null}
      <div className="access-user-meta">
        <span>{roleLabels[user.role]}</span>
        <span>Último acesso: {formatLastLogin(user.lastLoginAt)}</span>
      </div>
      {error ? <div className="status-box error">{error}</div> : null}
      {saved ? <SuccessAlert message="Alterações salvas com sucesso." onDismiss={() => setSaved(false)} /> : null}
    </article>
  )
}

export function RolesPermissionsPanel({
  roles,
  permissions,
}: {
  roles: AccessRole[]
  permissions: AccessPermission[]
}) {
  const router = useRouter()
  const [selectedRole, setSelectedRole] = useState(roles[0]?.key ?? "SECRETARIA")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [saved, setSaved] = useState(false)
  const role = roles.find((item) => item.key === selectedRole)
  const groups = useMemo(() => {
    const grouped = new Map<string, AccessPermission[]>()
    for (const permission of permissions) {
      grouped.set(permission.group, [...(grouped.get(permission.group) ?? []), permission])
    }
    return [...grouped.entries()]
  }, [permissions])

  async function save(formData: FormData) {
    const permissionKeys = formData.getAll("permissionKeys").map(String)
    if (selectedRole === "ADMIN") {
      permissionKeys.push("user.manage", "role.manage")
    }
    const success = await submit(`/api/internal/roles/${selectedRole}/permissions`, "PATCH", {
      permissionKeys: [...new Set(permissionKeys)],
    }, setLoading, setError, router.refresh)
    if (success) setSaved(true)
  }

  if (!role) return <div className="manager-empty"><strong>Nenhuma função encontrada.</strong></div>

  return (
    <section className="manager-empty operation-panel role-permissions-panel">
      <div className="role-selector" role="tablist" aria-label="Selecionar função">
        {roles.map((item) => (
          <button
            aria-selected={item.key === selectedRole}
            className={item.key === selectedRole ? "active" : ""}
            key={item.key}
            onClick={() => { setSelectedRole(item.key); setError(""); setSaved(false) }}
            role="tab"
            type="button"
          >
            <strong>{item.name}</strong>
            <span>{item.userCount} usuários</span>
          </button>
        ))}
      </div>
      <div className="role-permission-heading">
        <div><h2>{role.name}</h2><p>{role.description}</p></div>
        <span>{role.permissionKeys.length} permissões ativas</span>
      </div>
      <form action={save}>
        <div className="permission-groups">
          {groups.map(([group, items]) => (
            <fieldset className="permission-group" key={group}>
              <legend>{group}</legend>
              {items.map((permission) => {
                const protectedPermission = selectedRole === "ADMIN" && ["user.manage", "role.manage"].includes(permission.key)
                return (
                  <label key={`${selectedRole}-${permission.key}`}>
                    <input
                      defaultChecked={role.permissionKeys.includes(permission.key)}
                      disabled={protectedPermission}
                      name="permissionKeys"
                      type="checkbox"
                      value={permission.key}
                    />
                    <span><strong>{permission.name}</strong><small>{permission.description}</small></span>
                  </label>
                )
              })}
            </fieldset>
          ))}
        </div>
        {error ? <div className="status-box error">{error}</div> : null}
        <div className="role-save-actions">
          <button className="primary-button compact-button" disabled={loading} type="submit">
            {loading ? "Salvando..." : "Salvar permissões"}
          </button>
        </div>
      </form>
      {saved ? <SuccessAlert message="Permissões salvas com sucesso." onDismiss={() => setSaved(false)} /> : null}
    </section>
  )
}

function Field({ name, label, type = "text", required = false }: { name: string; label: string; type?: string; required?: boolean }) {
  return <label className="field"><span>{label}</span><input name={name} required={required} type={type} /></label>
}

function formatLastLogin(value: string | null) {
  if (!value) return "Nunca"
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
}

async function submit(
  url: string,
  method: string,
  payload: Record<string, unknown>,
  setLoading: (value: boolean) => void,
  setError: (value: string) => void,
  refresh: () => void,
) {
  setLoading(true); setError("")
  try {
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
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
