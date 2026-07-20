# Database Model

## Prisma

- Local: `apps/api/prisma/schema.prisma`
- Provider: PostgreSQL
- Env: `DATABASE_URL`
- Seed: `apps/api/prisma/seed.mjs`
- Scripts: `db:generate`, `db:push`, `db:migrate:dev`, `db:seed`

## Entidades

| Entidade | Obrigatórios | Opcionais | Regras |
| --- | --- | --- | --- |
| User | id, name, username, email, passwordHash, role, active, createdAt, updatedAt | lastLoginAt, deletedAt | `username` e `email` únicos; papéis: ADMIN, SECRETARIA, PADRE. |
| Priest | id, userId, name, active, createdAt, updatedAt | appointmentDurationMin, deletedAt | `userId` único; duração específica vence padrão. |
| Availability | id, priestId, dayOfWeek, startTime, endTime, active, createdAt, updatedAt | deletedAt | Disponibilidade semanal; não reserva slot. |
| BlockedSlot | id, priestId, startAt, endAt, createdById, active, createdAt, updatedAt | operationalReason, deletedAt | Bloqueio vence disponibilidade; motivo sem conteúdo sensível. |
| Appointment | id, priestId, sequenceNumber, startAt, endAt, status, faithfulName, faithfulPhone, faithfulLastName, createdAt, updatedAt | cancelledAt, completedAt, deletedAt | Slot ativo único por padre/início; status controlado por enum. |
| AppointmentCode | id, appointmentId, codeHash, active, createdAt | revokedAt | Código privado não sequencial; hash único; nunca texto puro. |
| SystemSetting | key, value, valueType, updatedAt | description, updatedById | Parâmetros persistidos, validados no backend e auditados. |
| QrCode | id, publicPath, version, active, generatedAt | generatedById, revokedAt | Aponta apenas para `/agendar`; sem PII. |
| AuditLog | id, action, entityType, occurredAt | actorUserId, entityId, metadataSafe | Sem código, telefone integral ou conteúdo espiritual. |

## Relacionamentos

| Origem | Relação | Destino |
| --- | --- | --- |
| User | 1:0..1 | Priest |
| Priest | 1:N | Availability |
| Priest | 1:N | BlockedSlot |
| Priest | 1:N | Appointment |
| Appointment | 1:0..1 | AppointmentCode |
| User | 1:N | AuditLog, BlockedSlot, SystemSetting, QrCode |

## Índices e constraints

| Tabela | Índices/constraints |
| --- | --- |
| users | unique(username); unique(email); index(role, active); index(username); index(deletedAt). |
| priests | unique(userId); index(active); index(deletedAt). |
| availabilities | index(priestId, dayOfWeek, active); index(deletedAt). |
| blocked_slots | index(priestId, startAt, endAt, active); index(deletedAt). |
| appointments | unique(sequenceNumber); unique parcial PostgreSQL para slot ativo `(priestId, startAt)` em `AGENDADO/PENDENTE_CONFIRMACAO`; index(status, startAt); index(faithfulPhone, status, startAt); index(faithfulPhone, faithfulLastName, startAt, status); index(priestId, startAt, endAt, status); index(deletedAt). |
| appointment_codes | unique(appointmentId); unique(codeHash); index(active); index(appointmentId, active). |
| system_settings | PK(key); index(updatedAt). |
| qr_codes | unique(version); index(active, generatedAt). |
| audit_logs | index(entityType, entityId, occurredAt); index(actorUserId, occurredAt). |

## Soft delete e auditoria

- Soft delete/inativação: User, Priest, Availability, BlockedSlot, Appointment.
- Mutáveis: `createdAt`, `updatedAt`; quando aplicável, `deletedAt`.
- Auditoria: mutações operacionais registradas em `AuditLog`.
- Reserva/reagendamento: transação única no backend.
- Conflito de slot: transação serializável + unique parcial PostgreSQL para slot ativo.

## Seed inicial

- `timezone` e `default_appointment_duration_minutes`: valores técnicos iniciais; confirmar com operação.

| Chave | Valor |
| --- | --- |
| minimum_booking_lead_hours | 2 |
| minimum_cancellation_lead_hours | 24 |
| booking_window_days | 30 |
| manual_override_enabled | true |
| code_recovery_enabled | true |
| receipt_enabled | true |
| default_appointment_duration_minutes | 30 |
| timezone | America/Sao_Paulo |
| qrCode.publicPath | /agendar |
