import { CodeRecovery } from '@/components/code-recovery'
import { PublicShell } from '@/components/public-shell'

export default function RecoverCodePage() {
  return (
    <PublicShell>
      <div className="page-wrap">
        <section className="page-title">
          <h1>Recupere seu codigo com seguranca.</h1>
        </section>
        <CodeRecovery />
      </div>
    </PublicShell>
  )
}
