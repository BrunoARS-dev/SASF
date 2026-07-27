import Link from 'next/link'
import { canAccess, InternalRouteKey, InternalUser } from '@/lib/auth'
import type { ManagerDashboard } from '@/lib/manager-api'

export function ManagerHome({
  user,
  dashboard,
}: {
  user: InternalUser
  dashboard: ManagerDashboard
}) {
  const maxWeekdayCount = Math.max(
    1,
    ...dashboard.appointmentsByWeekday.map((day) => day.count),
  )

  return (
    <div className="manager-content dashboard">
      <section className="manager-title dashboard-heading">
        <div>
          <p className="manager-eyebrow">Visão geral</p>
          <h1>Painel gestor</h1>
          <p>
            Indicadores consolidados para acompanhar a procura e os atendimentos.
          </p>
        </div>
        <span className="dashboard-scope">
          Histórico de agendamentos
        </span>
      </section>

      <section className="dashboard-metrics" aria-label="Indicadores principais">
        <MetricCard
          label="Agendamentos registrados"
          value={dashboard.totals.appointments}
          detail={`${dashboard.totals.upcoming} próximos`}
        />
        <MetricCard
          label="Confissões realizadas"
          value={dashboard.totals.realized}
          detail="Atendimentos confirmados"
          tone="positive"
        />
        <MetricCard
          label="Ausências"
          value={dashboard.totals.absent}
          detail="Faltas registradas"
          tone="warning"
        />
        <MetricCard
          label="Cancelamentos"
          value={dashboard.totals.cancelled}
          detail="Agendamentos cancelados"
        />
        <MetricCard
          label="Taxa de comparecimento"
          value={
            dashboard.attendanceRate === null
              ? '—'
              : `${formatNumber(dashboard.attendanceRate)}%`
          }
          detail="Entre realizados e ausências"
          tone="positive"
        />
        <MetricCard
          label="Aguardando confirmação"
          value={dashboard.totals.pendingConfirmation}
          detail="Atendimentos passados pendentes"
          tone="warning"
        />
      </section>

      <section className="dashboard-demand" aria-labelledby="weekday-demand-title">
        <div className="dashboard-section-heading">
          <div>
            <p className="manager-eyebrow">Comportamento da procura</p>
            <h2 id="weekday-demand-title">Agendamentos por dia da semana</h2>
            <p>
              Distribuição baseada nos agendamentos registrados, não em consultas
              sem confirmação.
            </p>
          </div>
        </div>

        <div className="dashboard-highlights">
          <WeekdayHighlight
            label="Dia mais recorrente"
            day={dashboard.mostRecurringDay}
            tone="positive"
          />
          <WeekdayHighlight
            label="Dia menos recorrente"
            day={dashboard.leastRecurringDay}
          />
        </div>

        <div className="weekday-chart" aria-label="Distribuição por dia da semana">
          {dashboard.appointmentsByWeekday.map((day) => (
            <div className="weekday-chart-row" key={day.dayOfWeek}>
              <span>{shortWeekday(day.label)}</span>
              <div className="weekday-chart-track" aria-hidden="true">
                <div
                  className="weekday-chart-bar"
                  style={{ width: `${(day.count / maxWeekdayCount) * 100}%` }}
                />
              </div>
              <strong>{day.count}</strong>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

function MetricCard({
  label,
  value,
  detail,
  tone = 'neutral',
}: {
  label: string
  value: number | string
  detail: string
  tone?: 'neutral' | 'positive' | 'warning'
}) {
  return (
    <article className={`dashboard-metric dashboard-metric-${tone}`}>
      <span>{label}</span>
      <strong>{typeof value === 'number' ? formatNumber(value) : value}</strong>
      <small>{detail}</small>
    </article>
  )
}

function WeekdayHighlight({
  label,
  day,
  tone = 'neutral',
}: {
  label: string
  day: ManagerDashboard['mostRecurringDay']
  tone?: 'neutral' | 'positive'
}) {
  return (
    <article className={`weekday-highlight weekday-highlight-${tone}`}>
      <span>{label}</span>
      <strong>{day?.label ?? 'Sem dados'}</strong>
      <small>
        {day ? `${formatNumber(day.count)} agendamento${day.count === 1 ? '' : 's'}` : 'Nenhum agendamento registrado'}
      </small>
    </article>
  )
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(value)
}

function shortWeekday(label: string) {
  return label.replace('-feira', '')
}

export function ManagerPlaceholder({
  user,
  routeKey,
  title,
  description,
}: {
  user: InternalUser
  routeKey: InternalRouteKey
  title: string
  description: string
}) {
  if (!canAccess(user.role, routeKey)) {
    return (
      <div className="manager-content">
        <section className="manager-title">
          <h1>Acesso indisponivel</h1>
          <p>Seu perfil nao possui permissao para esta area.</p>
        </section>
        <Link className="secondary-button manager-back" href="/gestor">
          Voltar ao painel
        </Link>
      </div>
    )
  }

  return (
    <div className="manager-content">
      <section className="manager-title">
        <h1>{title}</h1>
        <p>{description}</p>
      </section>
      <div className="manager-empty">
        <strong>Base pronta</strong>
        <p>Esta area ja esta protegida por sessao e perfil. O CRUD completo fica para a proxima etapa.</p>
      </div>
    </div>
  )
}
