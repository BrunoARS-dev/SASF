import { AppointmentScheduler } from '@/components/appointment-scheduler'
import { PublicShell } from '@/components/public-shell'

export default function SchedulePage() {
  return (
    <PublicShell>
      <div className="page-wrap">
        <section className="page-title">
          <h1>Agende sua confissao com simplicidade.</h1>
          <p>Escolha um dia, informe poucos dados e guarde o codigo privado para consultar ou cancelar depois.</p>
        </section>
        <AppointmentScheduler />
      </div>
    </PublicShell>
  )
}
