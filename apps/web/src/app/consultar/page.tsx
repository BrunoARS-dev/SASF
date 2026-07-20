import { CodeLookup } from '@/components/code-lookup'
import { PublicShell } from '@/components/public-shell'

export default function LookupPage() {
  return (
    <PublicShell>
      <div className="page-wrap">
        <section className="page-title">
          <h1>Consulte ou cancele seu agendamento.</h1>
          <p>Informe somente o codigo privado. Ele e a chave para acessar o seu proprio agendamento.</p>
        </section>
        <CodeLookup />
      </div>
    </PublicShell>
  )
}
