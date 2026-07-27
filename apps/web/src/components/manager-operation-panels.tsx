"use client";

import { useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type {
  ManagerAvailability,
  ManagerBlockedSlot,
  ManagerPriest,
  ManagerQrCode,
  ManagerSetting,
} from "@/lib/manager-api";
import { ConfirmationAlert, SuccessAlert } from "./ui-feedback";

const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sab"];

const settingCopy: Record<string, { label: string; description: string }> = {
  minimum_booking_lead_hours: {
    label: "Antecedência para agendar",
    description:
      "Quantidade mínima de horas entre o agendamento e o horário escolhido.",
  },
  minimum_cancellation_lead_hours: {
    label: "Prazo para cancelamento",
    description:
      "Quantidade mínima de horas de antecedência para o fiel cancelar.",
  },
  booking_window_days: {
    label: "Período disponível para agendamento",
    description:
      "Quantidade de dias futuros que ficarão disponíveis para escolha.",
  },
  manual_override_enabled: {
    label: "Agendamento manual",
    description: "Permite que a equipe interna faça agendamentos pela agenda.",
  },
  code_recovery_enabled: {
    label: "Recuperação de código",
    description: "Permite que o fiel recupere o código privado do agendamento.",
  },
  receipt_enabled: {
    label: "Comprovante de agendamento",
    description:
      "Habilita a disponibilidade do comprovante após o agendamento.",
  },
  default_appointment_duration_minutes: {
    label: "Duração padrão do atendimento",
    description:
      "Duração usada quando o padre não possui um tempo específico configurado.",
  },
  timezone: {
    label: "Fuso horário",
    description: "Fuso horário cadastrado para a operação do sistema.",
  },
};

export function ManualAppointmentPanel({
  priests,
  onCancel,
}: {
  priests: ManagerPriest[];
  onCancel: () => void;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createManual(formData: FormData) {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/internal/appointments/manual", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          faithfulName: String(formData.get("faithfulName") ?? ""),
          faithfulLastName: String(formData.get("faithfulLastName") ?? ""),
          faithfulPhone: String(formData.get("faithfulPhone") ?? ""),
          startAt: String(formData.get("startAt") ?? ""),
          priestId: String(formData.get("priestId") ?? "") || undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(
          typeof data?.message === "string"
            ? data.message
            : "Nao foi possivel salvar agora."
        );
        return;
      }

      router.refresh();
      onCancel();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Nao foi possivel salvar agora."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <ManagerCrud title="Inclusão manual">
      <form className="manager-form-grid" action={createManual}>
        <Field name="faithfulName" label="Nome" required />
        <Field name="faithfulLastName" label="Ultimo sobrenome" required />
        <Field
          name="faithfulPhone"
          label="Telefone"
          type="tel"
          inputMode="tel"
          required
        />
        <Field
          name="startAt"
          label="Data e hora"
          type="datetime-local"
          required
        />
        <PriestSelect priests={priests} />
        <div className="manager-form-actions">
          <button className="primary-button" type="submit" disabled={loading}>
            {loading ? "Salvando..." : "Criar"}
          </button>
          <button
            className="secondary-button"
            type="button"
            disabled={loading}
            onClick={() => {
              setError("");
              onCancel();
            }}
          >
            Cancelar
          </button>
        </div>
      </form>
      <ErrorText message={error} />
    </ManagerCrud>
  );
}

export function PriestsPanel({ priests }: { priests: ManagerPriest[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createPriest(formData: FormData) {
    const appointmentDurationMin = numberOrUndefined(
      formData.get("appointmentDurationMin")
    );

    await submitJson(
      "/api/internal/priests",
      "POST",
      {
        name: String(formData.get("name") ?? ""),
        username: String(formData.get("username") ?? ""),
        email: String(formData.get("email") ?? ""),
        password: String(formData.get("password") ?? ""),
        appointmentDurationMin,
      },
      setLoading,
      setError,
      router.refresh
    );
  }

  return (
    <ManagerCrud
      title="Padres"
      description="Cadastre e mantenha padres ativos para a agenda."
    >
      <form className="manager-form-grid" action={createPriest}>
        <Field name="name" label="Nome" required />
        <Field name="username" label="Usuario" required />
        <Field name="email" label="E-mail" type="email" required />
        <Field name="password" label="Senha inicial" type="password" required />
        <Field
          name="appointmentDurationMin"
          label="Duracao por atendimento (min)"
          type="number"
        />
        <button
          className="primary-button compact-button manager-add-button"
          type="submit"
          disabled={loading}
        >
          {loading ? "Salvando..." : "Adicionar"}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {priests.map((priest) => (
          <EditablePriest key={priest.id} priest={priest} />
        ))}
      </div>
    </ManagerCrud>
  );
}

function EditablePriest({ priest }: { priest: ManagerPriest }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);

  async function update(formData: FormData) {
    const saved = await submitJson(
      `/api/internal/priests/${priest.id}`,
      "PATCH",
      {
        name: String(formData.get("name") ?? ""),
        appointmentDurationMin: numberOrUndefined(
          formData.get("appointmentDurationMin")
        ),
        active: formData.get("active") === "on",
      },
      setLoading,
      setError,
      router.refresh
    );

    if (saved) {
      setHasChanges(false);
      setSavedSuccessfully(true);
    }
  }

  async function remove() {
    const removed = await submitJson(
      `/api/internal/priests/${priest.id}`,
      "DELETE",
      null,
      setLoading,
      setError,
      router.refresh
    );

    if (removed) {
      setShowDeleteConfirmation(false);
    }
  }

  function updatePendingState(form: HTMLFormElement) {
    const formData = new FormData(form);
    setHasChanges(
      String(formData.get("name") ?? "") !== priest.name ||
        String(formData.get("appointmentDurationMin") ?? "") !==
          String(priest.appointmentDurationMin ?? "") ||
        (formData.get("active") === "on") !== priest.active
    );
  }

  return (
    <article className="manager-list-item">
      <form className="manager-inline-form" action={update}>
        <div>
          <strong>{priest.name}</strong>
          <span>
            {priest.user
              ? `${priest.user.username} · ${priest.user.email}`
              : "Sem conta vinculada"}
          </span>
        </div>
        <input
          name="name"
          defaultValue={priest.name}
          aria-label="Nome do padre"
          onInput={(event) => updatePendingState(event.currentTarget.form!)}
        />
        <input
          name="appointmentDurationMin"
          defaultValue={priest.appointmentDurationMin ?? ""}
          inputMode="numeric"
          aria-label="Duracao"
          onInput={(event) => updatePendingState(event.currentTarget.form!)}
        />
        <div className="manager-status-actions">
          <label className="check-row">
            <input
              name="active"
              type="checkbox"
              defaultChecked={priest.active}
              onChange={(event) => updatePendingState(event.currentTarget.form!)}
            />{" "}
            Ativo
          </label>
          <button
            aria-label="Remover padre"
            className="icon-danger-button"
            disabled={loading}
            title="Remover padre"
            type="button"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <TrashIcon />
          </button>
        </div>
        <button
          className={`${
            hasChanges ? "primary-button" : "secondary-button"
          } compact-button`}
          disabled={loading}
          type="submit"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
      <ErrorText message={error} />
      {savedSuccessfully ? (
        <SuccessAlert
          message="Alterações salvas com sucesso."
          onDismiss={() => setSavedSuccessfully(false)}
        />
      ) : null}
      <ConfirmationAlert
        open={showDeleteConfirmation}
        title={`Remover ${priest.name}?`}
        description="O histórico será preservado e este cadastro poderá ser restaurado posteriormente."
        loading={loading}
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={remove}
      />
    </article>
  );
}

export function AvailabilitiesPanel({
  priests,
  availabilities,
}: {
  priests: ManagerPriest[];
  availabilities: ManagerAvailability[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createAvailability(formData: FormData) {
    await submitJson(
      "/api/internal/availabilities",
      "POST",
      formDataToObject(formData),
      setLoading,
      setError,
      router.refresh
    );
  }

  return (
    <ManagerCrud
      title="Disponibilidades"
      description="Defina os intervalos recorrentes em que cada padre atende."
    >
      <form className="manager-form-grid" action={createAvailability}>
        <PriestSelect priests={priests} />
        <WeekdaySelect />
        <Field name="startTime" label="Inicio" type="time" required />
        <Field name="endTime" label="Fim" type="time" required />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Adicionar"}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {availabilities.map((availability) => (
          <EditableAvailability
            key={availability.id}
            availability={availability}
          />
        ))}
      </div>
    </ManagerCrud>
  );
}

function EditableAvailability({
  availability,
}: {
  availability: ManagerAvailability;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  async function update(formData: FormData) {
    const saved = await submitJson(
      `/api/internal/availabilities/${availability.id}`,
      "PATCH",
      {
        dayOfWeek: Number(formData.get("dayOfWeek")),
        startTime: String(formData.get("startTime") ?? ""),
        endTime: String(formData.get("endTime") ?? ""),
        active: formData.get("active") === "on",
      },
      setLoading,
      setError,
      router.refresh
    );

    if (saved) {
      setHasChanges(false);
      setSavedSuccessfully(true);
    }
  }

  async function remove() {
    const removed = await submitJson(
      `/api/internal/availabilities/${availability.id}`,
      "DELETE",
      null,
      setLoading,
      setError,
      router.refresh
    );

    if (removed) {
      setShowDeleteConfirmation(false);
    }
  }

  function updatePendingState(form: HTMLFormElement) {
    const formData = new FormData(form);
    setHasChanges(
      Number(formData.get("dayOfWeek")) !== availability.dayOfWeek ||
        String(formData.get("startTime") ?? "") !== availability.startTime ||
        String(formData.get("endTime") ?? "") !== availability.endTime ||
        (formData.get("active") === "on") !== availability.active
    );
  }

  return (
    <article className="manager-list-item">
      <form
        className="manager-inline-form availability-inline-form"
        action={update}
        onInput={(event) => updatePendingState(event.currentTarget)}
      >
        <div>
          <strong>{availability.priest.name}</strong>
          <span>
            {weekdays[availability.dayOfWeek]} · {availability.startTime} -{" "}
            {availability.endTime}
          </span>
        </div>
        <select
          name="dayOfWeek"
          defaultValue={availability.dayOfWeek}
          aria-label="Dia da semana"
        >
          {weekdays.map((day, index) => (
            <option key={day} value={index}>
              {day}
            </option>
          ))}
        </select>
        <input
          name="startTime"
          type="time"
          defaultValue={availability.startTime}
          aria-label="Inicio"
        />
        <input
          name="endTime"
          type="time"
          defaultValue={availability.endTime}
          aria-label="Fim"
        />
        <div className="manager-status-actions">
          <label className="check-row">
            <input
              name="active"
              type="checkbox"
              defaultChecked={availability.active}
            />{" "}
            Ativa
          </label>
          <button
            aria-label="Remover disponibilidade"
            className="icon-danger-button"
            disabled={loading}
            title="Remover disponibilidade"
            type="button"
            onClick={() => setShowDeleteConfirmation(true)}
          >
            <TrashIcon />
          </button>
        </div>
        <button
          className={`${
            hasChanges ? "primary-button" : "secondary-button"
          } compact-button`}
          disabled={loading}
          type="submit"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
      <ErrorText message={error} />
      {savedSuccessfully ? (
        <SuccessAlert
          message="Alterações salvas com sucesso."
          onDismiss={() => setSavedSuccessfully(false)}
        />
      ) : null}
      <ConfirmationAlert
        open={showDeleteConfirmation}
        title="Remover esta disponibilidade?"
        description={`A disponibilidade de ${availability.priest.name} às ${availability.startTime} deixará de aparecer na agenda.`}
        loading={loading}
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={remove}
      />
    </article>
  );
}

export function BlockedSlotsPanel({
  priests,
  blockedSlots,
}: {
  priests: ManagerPriest[];
  blockedSlots: ManagerBlockedSlot[];
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function createBlockedSlot(formData: FormData) {
    await submitJson(
      "/api/internal/blocked-slots",
      "POST",
      {
        priestId: String(formData.get("priestId") ?? ""),
        startAt: localDateTimeToIso(formData.get("startAt")),
        endAt: localDateTimeToIso(formData.get("endAt")),
        operationalReason: String(formData.get("operationalReason") ?? ""),
      },
      setLoading,
      setError,
      router.refresh
    );
  }

  return (
    <ManagerCrud
      title="Bloqueios"
      description="Registre indisponibilidades operacionais sem expor motivo ao fiel."
    >
      <form className="manager-form-grid" action={createBlockedSlot}>
        <PriestSelect priests={priests} />
        <Field name="startAt" label="Inicio" type="datetime-local" required />
        <Field name="endAt" label="Fim" type="datetime-local" required />
        <Field name="operationalReason" label="Motivo operacional" />
        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Salvando..." : "Adicionar"}
        </button>
      </form>
      <ErrorText message={error} />
      <div className="manager-list">
        {blockedSlots.map((slot) => (
          <BlockedSlotRow key={slot.id} blockedSlot={slot} />
        ))}
      </div>
    </ManagerCrud>
  );
}

function BlockedSlotRow({ blockedSlot }: { blockedSlot: ManagerBlockedSlot }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  async function toggleActive() {
    await submitJson(
      `/api/internal/blocked-slots/${blockedSlot.id}`,
      "PATCH",
      { active: !blockedSlot.active },
      setLoading,
      setError,
      router.refresh
    );
  }

  async function remove() {
    const removed = await submitJson(
      `/api/internal/blocked-slots/${blockedSlot.id}`,
      "DELETE",
      null,
      setLoading,
      setError,
      router.refresh
    );

    if (removed) {
      setShowDeleteConfirmation(false);
    }
  }

  return (
    <article className="manager-list-item">
      <div className="manager-row">
        <div>
          <strong>{blockedSlot.priest.name}</strong>
          <span>
            {formatDateTime(blockedSlot.startAt)} -{" "}
            {formatDateTime(blockedSlot.endAt)}
          </span>
          {blockedSlot.operationalReason ? (
            <small>{blockedSlot.operationalReason}</small>
          ) : null}
        </div>
        <button
          className="secondary-button compact-button"
          disabled={loading}
          type="button"
          onClick={toggleActive}
        >
          {blockedSlot.active ? "Desativar" : "Ativar"}
        </button>
        <button
          className="quiet-danger-button compact-button"
          disabled={loading}
          type="button"
          onClick={() => setShowDeleteConfirmation(true)}
        >
          Remover
        </button>
      </div>
      <ErrorText message={error} />
      <ConfirmationAlert
        open={showDeleteConfirmation}
        title="Remover este bloqueio?"
        description="O período voltará a ficar disponível para agendamentos, caso exista disponibilidade cadastrada."
        loading={loading}
        onCancel={() => setShowDeleteConfirmation(false)}
        onConfirm={remove}
      />
    </article>
  );
}

export function SettingsPanel({ settings }: { settings: ManagerSetting[] }) {
  return (
    <ManagerCrud
      title="Configuracoes"
      description="Defina as regras usadas nos agendamentos e atendimentos."
    >
      <div className="manager-list">
        {settings.map((setting) => (
          <SettingRow key={setting.key} setting={setting} />
        ))}
      </div>
    </ManagerCrud>
  );
}

function SettingRow({ setting }: { setting: ManagerSetting }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const copy = settingCopy[setting.key] ?? {
    label: setting.key,
    description: setting.description ?? setting.valueType,
  };

  async function update(formData: FormData) {
    const saved = await submitJson(
      "/api/internal/settings",
      "PATCH",
      { key: setting.key, value: String(formData.get("value") ?? "") },
      setLoading,
      setError,
      router.refresh
    );

    if (saved) {
      setHasChanges(false);
      setSavedSuccessfully(true);
    }
  }

  function updatePendingValue(value: string) {
    setHasChanges(value !== setting.value);
  }

  return (
    <article className="manager-list-item">
      <form className="manager-inline-form" action={update}>
        <div>
          <strong>{copy.label}</strong>
          <span>{copy.description}</span>
        </div>
        {setting.valueType === "BOOLEAN" ? (
          <select
            name="value"
            defaultValue={setting.value}
            aria-label={copy.label}
            onChange={(event) => updatePendingValue(event.currentTarget.value)}
          >
            <option value="true">Sim</option>
            <option value="false">Nao</option>
          </select>
        ) : (
          <input
            name="value"
            defaultValue={setting.value}
            inputMode={setting.valueType === "INTEGER" ? "numeric" : "text"}
            aria-label={copy.label}
            onInput={(event) => updatePendingValue(event.currentTarget.value)}
          />
        )}
        <button
          className={`${
            hasChanges ? "primary-button" : "secondary-button"
          } compact-button`}
          disabled={loading}
          type="submit"
        >
          {loading ? "Salvando..." : "Salvar"}
        </button>
      </form>
      <ErrorText message={error} />
      {savedSuccessfully ? (
        <SuccessAlert
          message="Alterações salvas com sucesso."
          onDismiss={() => setSavedSuccessfully(false)}
        />
      ) : null}
    </article>
  );
}

export function QrCodePanel({ qrCode }: { qrCode: ManagerQrCode | null }) {
  const [publicUrl, setPublicUrl] = useState("");

  useEffect(() => {
    setPublicUrl(
      qrCode
        ? new URL(qrCode.publicPath, window.location.origin).toString()
        : ""
    );
  }, [qrCode]);

  return (
    <ManagerCrud title="QR Code">
      <div className="qr-panel">
        <div className="qr-print-area">
          <div className="qr-print-heading">
            <p>Agendamento de confissão</p>
            <small>
              Aponte a câmera do celular para o QR Code e escolha o melhor
              horário.
            </small>
          </div>
          <div className="qr-box">
            {publicUrl ? (
              <QRCodeSVG
                aria-label={`QR Code para ${publicUrl}`}
                level="M"
                marginSize={2}
                size={180}
                title="QR Code para o agendamento publico"
                value={publicUrl}
              />
            ) : (
              <span aria-hidden="true">QR</span>
            )}
          </div>
        </div>
        <div className="qr-details">
          <button
            className="primary-button"
            type="button"
            disabled={!publicUrl}
            onClick={() => window.print()}
          >
            Imprimir QR Code
          </button>
        </div>
      </div>
    </ManagerCrud>
  );
}

function ManagerCrud({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>{title}</h1>
        {description ? <p>{description}</p> : null}
      </section>
      <div className="manager-empty operation-panel">{children}</div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required = false,
  inputMode,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
}) {
  return (
    <div className="field">
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        name={name}
        type={type}
        inputMode={inputMode}
        required={required}
      />
    </div>
  );
}

function PriestSelect({ priests }: { priests: ManagerPriest[] }) {
  return (
    <div className="field">
      <label htmlFor="priestId">Padre</label>
      <select id="priestId" name="priestId" required>
        {priests
          .filter((priest) => priest.active)
          .map((priest) => (
            <option key={priest.id} value={priest.id}>
              {priest.name}
            </option>
          ))}
      </select>
    </div>
  );
}

function WeekdaySelect() {
  return (
    <div className="field">
      <label htmlFor="dayOfWeek">Dia</label>
      <select id="dayOfWeek" name="dayOfWeek" defaultValue="1" required>
        {weekdays.map((day, index) => (
          <option key={day} value={index}>
            {day}
          </option>
        ))}
      </select>
    </div>
  );
}

function ErrorText({ message }: { message: string }) {
  return message ? <div className="status-box error">{message}</div> : null;
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 7h16M9 7V4h6v3m3 0-1 13H7L6 7m4 4v5m4-5v5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function formDataToObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

async function submitJson(
  url: string,
  method: string,
  payload: Record<string, unknown> | null,
  setLoading: (loading: boolean) => void,
  setError: (error: string) => void,
  refresh: () => void
) {
  setLoading(true);
  setError("");

  try {
    const response = await fetch(url, {
      method,
      headers: payload ? { "Content-Type": "application/json" } : undefined,
      body: payload ? JSON.stringify(payload) : undefined,
    });

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      setError(
        typeof data?.message === "string"
          ? data.message
          : "Nao foi possivel salvar agora."
      );
      return false;
    }

    refresh();
    return true;
  } catch {
    setError("Nao foi possivel conectar agora.");
    return false;
  } finally {
    setLoading(false);
  }
}

function numberOrUndefined(value: FormDataEntryValue | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function localDateTimeToIso(value: FormDataEntryValue | null) {
  return new Date(String(value ?? "")).toISOString();
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
