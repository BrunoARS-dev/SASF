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
          {dashboard.period.label}
        </span>
      </section>

      <DashboardFilters period={dashboard.period} />

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

function DashboardFilters({ period }: { period: ManagerDashboard['period'] }) {
  const currentYear = new Date().getFullYear()
  const selectedYear = period.year ?? currentYear
  const selectedMonth = period.month ?? new Date().getMonth() + 1
  const years = Array.from({ length: 8 }, (_, index) => currentYear + 1 - index)
  const months = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ]

  return (
    <section className="dashboard-filters" aria-label="Período do dashboard">
      <nav className="dashboard-range-tabs" aria-label="Tipo de período">
        <Link
          href={`/gestor?range=month&year=${selectedYear}&month=${selectedMonth}`}
          aria-current={period.range === 'month' ? 'page' : undefined}
        >
          Mês
        </Link>
        <Link
          href={`/gestor?range=year&year=${selectedYear}`}
          aria-current={period.range === 'year' ? 'page' : undefined}
        >
          Ano
        </Link>
        <Link
          href="/gestor?range=all"
          aria-current={period.range === 'all' ? 'page' : undefined}
        >
          Desde sempre
        </Link>
      </nav>

      {period.range !== 'all' ? (
        <form className="dashboard-period-form" action="/gestor" method="get">
          <input name="range" type="hidden" value={period.range} />
          {period.range === 'month' ? (
            <label>
              <span>Mês</span>
              <select name="month" defaultValue={selectedMonth}>
                {months.map((month, index) => (
                  <option key={month} value={index + 1}>
                    {month}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          <label>
            <span>Ano</span>
            <select name="year" defaultValue={selectedYear}>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </label>
          <button className="primary-button compact-button" type="submit">
            Aplicar
          </button>
        </form>
      ) : (
        <p className="dashboard-all-time-note">
          Exibindo todos os agendamentos registrados.
        </p>
      )}
    </section>
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
