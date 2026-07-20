import { redirect } from 'next/navigation'
import { LoginForm } from '@/components/login-form'
import { PublicShell } from '@/components/public-shell'
import { getCurrentUser } from '@/lib/auth'

export default async function LoginPage() {
  const user = await getCurrentUser()

  if (user) {
    redirect('/gestor')
  }

  return (
    <PublicShell>
      <div className="page-wrap login-wrap">
        <section className="page-title">
          <h1>Acesso dos gestores.</h1>
          <p>Entre com usuario ou e-mail e senha. Este acesso e apenas para ADMIN, SECRETARIA e PADRE.</p>
        </section>
        <section className="flow-panel login-panel">
          <LoginForm />
        </section>
      </div>
    </PublicShell>
  )
}
