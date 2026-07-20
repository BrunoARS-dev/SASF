import { AppointmentConfirmation } from '@/components/appointment-confirmation'
import { PublicShell } from '@/components/public-shell'

export default function ConfirmedAppointmentPage() {
  return (
    <PublicShell>
      <div className="page-wrap">
        <section className="page-title">
          <h1>Seu horario foi reservado.</h1>
          <p>Confira os dados principais e copie o codigo privado antes de sair desta tela.</p>
        </section>
        <AppointmentConfirmation />
      </div>
    </PublicShell>
  )
}
