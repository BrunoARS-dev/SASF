# MVP Tasks

## 0 - decisoes de entrada

- [ ] Confirmar timezone e duracao padrao final; seed usa valor tecnico inicial revisavel (`America/Sao_Paulo`, `30min`).
- [ ] Definir dados minimos e retencao.
- [ ] Aprovar aviso de privacidade, suporte e politica de senha.
- [x] Definir sessao interna inicial de 8 horas com cookie HttpOnly.
- [ ] Validar modelo, contratos e rotas com operacao.

## 1 - infraestrutura

- [x] Criar monorepo `apps/web`, `apps/api`, `packages/shared`.
- [x] Configurar base de ambientes, scripts e convencoes.
- [x] Configurar runner minimo de testes da API.
- [ ] Configurar observabilidade, backup e recuperacao.

## 2 - dados e auditoria

- [x] Modelar Prisma: User, Priest, Availability, BlockedSlot, Appointment, AppointmentCode, SystemSetting, QrCode, AuditLog.
- [x] Preparar indices, soft delete, constraints e seed inicial de configuracoes.
- [x] Instalar dependencias, gerar client Prisma e validar schema.
- [x] Criar migracao inicial com `User.username` obrigatorio e unico.
- [x] Aplicar migration/db push em PostgreSQL local com `DATABASE_URL` valida.
- [x] Implementar persistencia real de auditoria segura.

## 3 - backend base

- [x] Criar PrismaService.
- [x] Criar filtro global de erro `{ code, message }`.
- [x] Criar validacao basica de campos obrigatorios.
- [x] Criar modulos NestJS do MVP.
- [x] Criar controllers/services/DTOs iniciais.

## 4 - backend interno

- [x] Implementar autenticacao, sessao e RBAC do MVP.
- [x] Ativar rate limit de login antes de piloto/producao.
- [x] Implementar settings minimo com validacao e auditoria.
- [x] Implementar settings completos com QR/configuracoes operacionais finais.
- [x] Implementar padres, disponibilidade e bloqueios administrativos reais.
- [x] Implementar agenda interna paginada.
- [x] Implementar confirmacao de realizado/ausente.
- [x] Implementar inclusao manual de agendamentos no painel gestor.

## 5 - backend publico

- [x] Implementar disponibilidade limitada e selecao automatica de padre.
- [x] Implementar reserva/reagendamento transacionais e status.
- [x] Implementar codigo privado, lookup, cancelamento e recuperacao anti-enumeracao.
- [x] Aplicar rate limit real nos endpoints publicos sensiveis.
- [x] Criar testes service-level das regras criticas de agendamento.
- [ ] Validar concorrencia com PostgreSQL real.
- [x] Implementar QR publico com versionamento/regeneracao de link.
- [ ] Implementar imagem QR escaneavel e gestao PNG/PDF se necessario.

## 6 - frontend

- [x] Implementar rotas publicas mobile-first e acessiveis.
- [x] Implementar agendamento publico com dias, calendario reduzido, horarios e formulario curto.
- [x] Implementar consulta, cancelamento e recuperacao por codigo.
- [x] Implementar confirmacao com copiar codigo e comprovante simples.
- [x] Implementar base do painel interno por papel e rotas protegidas.
- [x] Implementar login visual, logout e session/me via cookie HttpOnly.
- [x] Implementar agenda do dia no painel gestor com acoes realizado/ausente.
- [x] Implementar CRUDs internos operacionais de padres, disponibilidades, bloqueios e settings.
- [x] Implementar inclusao manual de agendamentos.
- [ ] Implementar QR visual escaneavel e estados internos futuros.
- [x] Validar typecheck/build do web apos instalar dependencias do workspace.

## 7 - validacao

- [x] Testar service-level: conflito de slot, um futuro ativo, cancelamento fora do prazo e recuperacao de codigo.
- [x] Validar smoke HTTP das rotas publicas do frontend.
- [x] Executar E2E real frontend + backend + banco.
- [ ] Testar concorrencia real, RBAC e enumeracao contra ambiente PostgreSQL.
- [ ] Validar visualmente login, agenda do dia e acoes realizado/ausente em navegador real.
- [ ] Validar visualmente CRUDs operacionais e RBAC ADMIN/SECRETARIA/PADRE em navegador real.
- [ ] Testar acessibilidade com idosos e desempenho movel.
- [ ] Validar carga, seguranca, backup e piloto controlado.
