# Implementation Plan

## Modulos NestJS

| Modulo | Responsabilidade | Depende de |
| --- | --- | --- |
| auth | sessao, login, identidade interna | users |
| users | usuarios, papeis e autorizacao | audit |
| priests | padres e duracao especifica | users, settings |
| settings | parametros, fuso, QR e validacao | audit |
| schedules | disponibilidade, slots e bloqueios | priests, settings |
| appointments | reserva, codigo, alteracao, cancelamento, status | schedules, settings, audit |
| attendance | pendentes, realizado e ausente | appointments, auth |
| audit | trilha segura de mutacoes | auth |
| qr | geracao e distribuicao de QR publico | settings, audit |

## Autenticacao e autorizacao

- Interno: login com username/e-mail e senha, hash de senha, cookie HttpOnly e expiracao de 8 horas.
- RBAC: ADMIN total; SECRETARIA agenda/operacao/configuracao se autorizada; PADRE agenda/confirmacao.
- Fiel: sem conta/sessao; codigo privado limitado ao proprio agendamento.
- Guards no backend e protecao de rota no frontend; nunca confiar so na UI.

## Parametros persistidos

| Chave | Padrao |
| --- | --- |
| `minimum_booking_lead_hours` | `2` |
| `minimum_cancellation_lead_hours` | `24` |
| `booking_window_days` | `30` |
| `manual_override_enabled` | `true` |
| `code_recovery_enabled` | `true` |
| `receipt_enabled` | `true` |
| `default_appointment_duration_minutes` | `30` tecnico inicial |
| `timezone` | `America/Sao_Paulo` tecnico inicial |

## Seguranca e performance

- Rate limit real aplicado ao login e aos fluxos publicos sensiveis de agendamento/codigo.
- Hash do codigo; mensagens neutras; QR sem dados; logs com metadata segura.
- Auditoria persistente em mutacoes de agendamento e configuracao, sem registrar codigo privado, hash, telefone, nome, senha, token, segredo ou motivo.
- Indices do modelo; paginacao interna; disponibilidade limitada a 30 dias/parametro.
- Escritas criticas de agendamento usam transacao serializavel e constraint parcial PostgreSQL para slot ativo.
- Cache curto apenas para disponibilidade publica pode ser adicionado depois; invalidar em reserva, bloqueio, configuracao ou padre.

## Fases tecnicas

| Fase | Entrega | Depende de |
| --- | --- | --- |
| 1 | Monorepo, configuracao, convencoes e seguranca base | decisoes operacionais |
| 2 | Modelo Prisma/PostgreSQL, migracoes, dados iniciais e auditoria | fase 1 |
| 3 | Auth/RBAC, settings minimo, padres, disponibilidade, bloqueios | fase 2 |
| 4 | Appointments, codigo, recuperacao, status, rate limit publico e testes minimos | fase 3; implementado no backend |
| 4b | QR, settings administrativos completos, padres, disponibilidade e bloqueios completos | fase 3 |
| 5 | Web publica do fiel | fase 4; primeira versao implementada |
| 5b | Painel interno | fase 4/4b |
| 6 | Testes de integracao PostgreSQL, acessibilidade, carga, seguranca, backup e piloto | fases 1-5 |

## Checklist de entrada para frontend

- [x] Auth/RBAC interno buildavel.
- [x] Regras principais de agendamento no backend.
- [x] Rate limit publico em endpoints sensiveis.
- [x] Auditoria persistente de mutacoes criticas.
- [x] Testes service-level das regras criticas.
- [x] Primeira versao do frontend publico do fiel.
- [ ] Aplicar migration/db push em PostgreSQL local com `DATABASE_URL`.
- [ ] Validar concorrencia contra PostgreSQL real.
- [ ] Instalar dependencias do workspace web e validar typecheck/build.
- [ ] Implementar stubs administrativos restantes quando o frontend depender deles.
