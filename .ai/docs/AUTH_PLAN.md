# Auth Plan

## Decisão do MVP

- Fiel não possui login.
- Fiel usa código privado para consultar, alterar e cancelar o próprio agendamento.
- Apenas usuários internos autenticam: `ADMIN`, `SECRETARIA`, `PADRE`.
- Login interno aceita `username` ou e-mail + senha.
- Sessão usa cookie HttpOnly; token não deve ser salvo em `localStorage`.
- Sessão inicial: 8 horas.
- Usuário interno pode estar ativo ou inativo; usuário inativo não autentica.
- Social login, MFA e recuperação automática por e-mail ficam fora do MVP.
- Admin pode redefinir senha de usuário interno.

## Segurança

- Senhas são armazenadas somente como hash seguro.
- Cookie de sessão:
  - `HttpOnly`
  - `SameSite=Lax`
  - `Secure` em produção
  - expiração de 8 horas
  - `Path=/`
- Login retorna mensagem neutra para credenciais inválidas.
- Login não informa se username/e-mail existe.
- Respostas de usuário nunca expõem `passwordHash`.
- Rate limit real aplicado no login com política inicial de 5 tentativas por minuto.
- `AUTH_SESSION_SECRET` é obrigatório em produção.

## Backend

- `AuthModule`, `AuthController`, `AuthService`.
- `POST /api/v1/auth/login`.
- `POST /api/v1/auth/logout`.
- `GET /api/v1/auth/me`.
- `GET /api/v1/auth/session`.
- `AuthGuard` valida cookie/sessão e bloqueia usuário inativo.
- `RolesGuard` aplica RBAC nos endpoints internos.
- `Roles` decorator define papéis por controller/rota.
- `CurrentUser` decorator disponível para handlers que precisem do usuário autenticado.
- Prisma Client gerado e migration inicial criada em `apps/api/prisma/migrations/`.

## Fora do MVP

- Login do fiel.
- Social login.
- Recuperação automática por e-mail.
- MFA.
- Frontend de login.
