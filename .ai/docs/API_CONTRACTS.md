# API Contracts

## Convencoes

- Prefixo: `/api/v1`
- JSON
- Datas: ISO-8601
- Publico: resposta minima/neutra
- Interno: cookie HttpOnly de sessao + RBAC
- Erro: `{ code, message }`
- Nunca expor existencia de agendamento sem codigo valido
- Nunca expor `passwordHash`

## Publico

| Verbo/rota | Payload/consulta | Resposta futura | Status atual |
| --- | --- | --- | --- |
| GET `/public/availability/days` | `from`, `to` | dias disponiveis; sem padre/PII | implementado |
| GET `/public/availability/times` | `date` | horarios `{ startAt, endAt, available }`; sem padre/PII | implementado |
| POST `/public/appointments` | faithfulName, faithfulPhone, faithfulLastName, startAt | `{ code, appointment, receiptAvailable }` | implementado com rate limit |
| POST `/public/appointments/lookup` | code | dados minimos do proprio agendamento | implementado com rate limit |
| DELETE `/public/appointments/{code}` | - | `{ ok: true }`; aplica prazo | implementado com rate limit |
| POST `/public/code-recovery` | faithfulPhone, faithfulLastName, date | resposta neutra; novo codigo apenas se match unico | implementado com rate limit |

## Interno

| Verbo/rota | Papel futuro | Payload/consulta | Status atual |
| --- | --- | --- | --- |
| POST `/auth/login` | interno | identifier ou username/email, password | implementado com rate limit |
| POST `/auth/logout` | autenticado | - | implementado |
| GET `/auth/me` | autenticado | - | implementado |
| GET `/auth/session` | autenticado | - | implementado |
| GET `/users` | ADMIN | page, limit | implementado basico |
| POST `/users` | ADMIN | name, username, email, password, role, active opcional | implementado basico |
| PATCH `/users/{id}/password` | ADMIN | password | implementado |
| GET `/priests` | ADMIN, SECRETARIA | page, limit | implementado |
| POST `/priests` | ADMIN, SECRETARIA | name, username, email, password, active, appointmentDurationMin | implementado; nao retorna hash |
| PATCH `/priests/{id}` | ADMIN, SECRETARIA | name, active, appointmentDurationMin | implementado com auditoria |
| DELETE `/priests/{id}` | ADMIN, SECRETARIA | - | soft delete implementado |
| GET `/availabilities` | ADMIN, SECRETARIA | page, limit | implementado |
| POST `/availabilities` | ADMIN, SECRETARIA | priestId, dayOfWeek, startTime, endTime | implementado com auditoria |
| PATCH `/availabilities/{id}` | ADMIN, SECRETARIA | dayOfWeek, startTime, endTime, active | implementado com auditoria |
| DELETE `/availabilities/{id}` | ADMIN, SECRETARIA | - | soft delete implementado |
| GET `/blocked-slots` | ADMIN, SECRETARIA | page, limit | implementado |
| POST `/blocked-slots` | ADMIN, SECRETARIA | priestId, startAt, endAt, operationalReason | implementado com auditoria |
| PATCH `/blocked-slots/{id}` | ADMIN, SECRETARIA | startAt, endAt, operationalReason, active | implementado com auditoria |
| DELETE `/blocked-slots/{id}` | ADMIN, SECRETARIA | - | soft delete implementado |
| GET `/appointments/day` | ADMIN, SECRETARIA, PADRE | date, page, limit | implementado |
| POST `/appointments/manual` | ADMIN, SECRETARIA | fiel + startAt + priestId opcional | implementado com auditoria |
| PATCH `/appointments/{id}/cancel` | ADMIN, SECRETARIA | - | implementado com auditoria |
| PATCH `/appointments/{id}/reschedule` | ADMIN, SECRETARIA | startAt | implementado com auditoria |
| PATCH `/appointments/{id}/attendance/realized` | ADMIN, SECRETARIA, PADRE | - | implementado com auditoria; PADRE limitado ao proprio perfil |
| PATCH `/appointments/{id}/attendance/absent` | ADMIN, SECRETARIA, PADRE | - | implementado com auditoria; PADRE limitado ao proprio perfil |
| GET `/settings` | ADMIN, SECRETARIA autorizada | - | implementado |
| PATCH `/settings` | ADMIN, SECRETARIA autorizada | key, value | implementado com auditoria |
| GET `/qr-codes/current` | ADMIN, SECRETARIA autorizada | - | implementado |
| POST `/qr-codes` | ADMIN, SECRETARIA autorizada | - | implementado; gera nova versao ativa para `/agendar` |
| GET `/audit-logs` | ADMIN | page, limit | implementado |

## Validacoes atuais

- Campos obrigatorios basicos por DTO.
- Erro padronizado por filtro global.
- Prefixo global configurado.
- Regras principais de agendamento implementadas: disponibilidade publica, reserva transacional serializavel, codigo privado com hash, recuperacao, cancelamento e agenda interna.
- Corridas de reserva retornam erro controlado de horario indisponivel.
- Rate limit real aplicado nos endpoints publicos sensiveis de criacao, lookup, cancelamento e recuperacao de codigo.
- Auditoria persistente aplicada em criacao, cancelamento, recuperacao de codigo, reagendamento, realizado, ausente e alteracao de configuracoes.
- Metadados de auditoria sao filtrados para nao gravar codigo privado, hash, telefone, nome, senha, token, segredo ou motivo.

## Validacoes futuras obrigatorias

- Geracao de arte QR escaneavel PNG/PDF ainda nao foi adicionada; endpoint atual versiona e retorna URL publica.
- Validar concorrencia com PostgreSQL real alem dos testes unitarios/service-level.
