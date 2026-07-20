# Current State

| Campo | Valor |
| --- | --- |
| Fase | Painel gestor operacional |
| Status | Bloco gestor de operacao da agenda implementado, com inclusao manual de agendamentos |
| Proxima etapa | Validar visualmente CRUDs gestoras e fluxo completo com usuarios ADMIN/SECRETARIA/PADRE |
| Codigo | Auth por cookie HttpOnly, RBAC interno, rate limit de login/publico, Prisma/migration inicial, auditoria persistente, logica real de agendamento, telas publicas do fiel, agenda gestora e CRUDs operacionais. |
| Fontes | `.ai/context/`, `.ai/docs/`, `.ai/project-memory/`, `.ai/tasks/`, `apps/api/prisma/schema.prisma` |

## Estado

- API prefix: `/api/v1`.
- Modulos criados: auth, users, priests, availability, blocked-slots, appointments, settings, audit, prisma.
- Auth interno implementado com login por username/e-mail, cookie HttpOnly de 8h, logout, `me/session`, hash de senha e bloqueio de usuario inativo.
- Rate limit real aplicado ao login e aos endpoints publicos sensiveis de criacao, lookup, cancelamento e recuperacao de codigo.
- Prisma Client gerado com `User.username`; migration inicial criada em `apps/api/prisma/migrations/20260629120000_initial/migration.sql`.
- Endpoints gestores protegidos por `AuthGuard` e `RolesGuard`; agenda interna, encaixe, cancelamento, reagendamento e presenca implementados.
- Endpoints publicos do fiel continuam sem login e baseados em codigo privado.
- Disponibilidade publica, criacao, lookup, cancelamento por codigo, recuperacao de codigo, padre automatico, conflito de slot e um agendamento futuro ativo por fiel implementados.
- Escritas criticas de agendamento usam transacao serializavel; slot ativo e protegido por unique parcial PostgreSQL na migration inicial.
- Auditoria persistente registra mutacoes de agendamento e configuracao com metadata segura.
- Runner minimo de testes da API configurado com Vitest e testes service-level das regras criticas de agendamento.
- Typecheck da API passa localmente apos a robustez minima.
- Frontend publico do fiel implementado em Next: `/agendar`, `/consultar`, `/recuperar-codigo`, `/agendamento/confirmado`.
- Telas publicas usam route handlers do Next para proxy da API via `API_URL`.
- Confirmacao mostra codigo, permite copiar e imprimir comprovante simples.
- Dependencias do workspace web instaladas; typecheck e build do web passam.
- Smoke HTTP local passou nas quatro rotas publicas principais.
- `.env` local da API/Web foi criado para E2E com `DATABASE_URL`/`API_URL`.
- Seed minimo foi preparado para settings, admin local, padre ativo, disponibilidade semanal e QR publico.
- Migration inicial aplicada no PostgreSQL local `sasf` em 2026-06-30.
- Seed minimo executado com sucesso em 2026-06-30.
- E2E publico real passou via Web proxy + API + PostgreSQL: listar dias, listar horarios, criar agendamento, consultar por codigo, cancelar fora do prazo com erro 400, recuperar codigo com match unico e cancelar dentro do prazo com sucesso.
- Dados de teste E2E: um agendamento publico dentro de 24h permaneceu ativo porque o cancelamento publico fora do prazo foi corretamente bloqueado.
- Login visual dos gestores criado em `/login`.
- Route handlers do Web para `/api/auth/login`, `/api/auth/session` e `/api/auth/logout` encaminham Auth para o backend preservando cookie HttpOnly.
- Rotas gestoras protegidas criadas: `/gestor`, `/gestor/agenda`, `/gestor/configuracoes`, `/gestor/padres`, `/gestor/disponibilidades`, `/gestor/bloqueios`, `/gestor/qrcode`.
- Navegacao gestora inicial filtra links por perfil ADMIN, SECRETARIA e PADRE.
- Agenda do dia implementada em `/gestor/agenda` com proxy interno autenticado, resumo, lista de atendimentos e acoes `realizado`/`ausente`.
- Backend restringe `PADRE` a visualizar e marcar apenas atendimentos vinculados ao proprio perfil; ADMIN e SECRETARIA visualizam a agenda geral.
- CRUDs operacionais implementados para padres, disponibilidades e bloqueios com soft delete e auditoria segura.
- Configuracoes parametrizaveis implementadas no painel gestor usando settings validados pelo backend.
- Inclusao manual de agendamentos implementada na agenda gestora para `ADMIN` e `SECRETARIA`.
- QR publico implementado como versionamento de link ativo para `/agendar`; imagem QR escaneavel/PNG/PDF permanece pendente sem dependencia pesada.
- Typecheck e build do Web passam apos o painel gestor inicial.
- Sem endpoints publicos de listagem de fieis/agendas.
- Dependencias instaladas e lockfile atualizado.

## Pendencias

- Validar visualmente frontend com API em execucao usando Browser/Playwright.
- Validar login/logout e redirects do painel gestor contra API local rodando.
- Validar visualmente a agenda do dia e as acoes `realizado`/`ausente` em navegador real.
- Rodar validacao de concorrencia contra PostgreSQL real, alem dos testes service-level.
- Validar CRUDs operacionais com banco real e usuarios de cada perfil.
- Implementar imagem QR escaneavel e exportacao PNG/PDF se necessario para impressao.
