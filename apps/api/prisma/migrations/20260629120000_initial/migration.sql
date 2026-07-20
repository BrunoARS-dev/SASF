-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SECRETARIA', 'PADRE');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADO', 'CANCELADO', 'PENDENTE_CONFIRMACAO', 'REALIZADO', 'AUSENTE');

-- CreateEnum
CREATE TYPE "SettingValueType" AS ENUM ('STRING', 'INTEGER', 'BOOLEAN');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "username" VARCHAR(80) NOT NULL,
    "email" VARCHAR(160) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastLoginAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "priests" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "appointmentDurationMin" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "priests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "availabilities" (
    "id" TEXT NOT NULL,
    "priestId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TIME(0) NOT NULL,
    "endTime" TIME(0) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "availabilities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "blocked_slots" (
    "id" TEXT NOT NULL,
    "priestId" TEXT NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "operationalReason" VARCHAR(180),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "blocked_slots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "priestId" TEXT NOT NULL,
    "sequenceNumber" SERIAL NOT NULL,
    "startAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADO',
    "faithfulName" VARCHAR(120) NOT NULL,
    "faithfulPhone" VARCHAR(32) NOT NULL,
    "faithfulLastName" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cancelledAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointment_codes" (
    "id" TEXT NOT NULL,
    "appointmentId" TEXT NOT NULL,
    "codeHash" VARCHAR(255) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "appointment_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "system_settings" (
    "key" VARCHAR(80) NOT NULL,
    "value" VARCHAR(255) NOT NULL,
    "valueType" "SettingValueType" NOT NULL,
    "description" VARCHAR(180),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedById" TEXT,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "qr_codes" (
    "id" TEXT NOT NULL,
    "publicPath" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generatedById" TEXT,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "qr_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" VARCHAR(80) NOT NULL,
    "entityType" VARCHAR(80) NOT NULL,
    "entityId" VARCHAR(120),
    "metadataSafe" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_active_idx" ON "users"("role", "active");

-- CreateIndex
CREATE INDEX "users_username_idx" ON "users"("username");

-- CreateIndex
CREATE INDEX "users_deletedAt_idx" ON "users"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "priests_userId_key" ON "priests"("userId");

-- CreateIndex
CREATE INDEX "priests_active_idx" ON "priests"("active");

-- CreateIndex
CREATE INDEX "priests_deletedAt_idx" ON "priests"("deletedAt");

-- CreateIndex
CREATE INDEX "availabilities_priestId_dayOfWeek_active_idx" ON "availabilities"("priestId", "dayOfWeek", "active");

-- CreateIndex
CREATE INDEX "availabilities_deletedAt_idx" ON "availabilities"("deletedAt");

-- CreateIndex
CREATE INDEX "blocked_slots_priestId_startAt_endAt_active_idx" ON "blocked_slots"("priestId", "startAt", "endAt", "active");

-- CreateIndex
CREATE INDEX "blocked_slots_deletedAt_idx" ON "blocked_slots"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_sequenceNumber_key" ON "appointments"("sequenceNumber");

-- CreateIndex
CREATE INDEX "appointments_status_startAt_idx" ON "appointments"("status", "startAt");

-- CreateIndex
CREATE INDEX "appointments_faithfulPhone_status_startAt_idx" ON "appointments"("faithfulPhone", "status", "startAt");

-- CreateIndex
CREATE INDEX "appointments_deletedAt_idx" ON "appointments"("deletedAt");

-- CreateIndex
CREATE INDEX "appointments_faithfulPhone_faithfulLastName_startAt_status_idx" ON "appointments"("faithfulPhone", "faithfulLastName", "startAt", "status");

-- CreateIndex
CREATE INDEX "appointments_priestId_startAt_endAt_status_idx" ON "appointments"("priestId", "startAt", "endAt", "status");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_active_priest_startAt_key" ON "appointments"("priestId", "startAt") WHERE "deletedAt" IS NULL AND "status" IN ('AGENDADO', 'PENDENTE_CONFIRMACAO');

-- CreateIndex
CREATE UNIQUE INDEX "appointment_codes_appointmentId_key" ON "appointment_codes"("appointmentId");

-- CreateIndex
CREATE UNIQUE INDEX "appointment_codes_codeHash_key" ON "appointment_codes"("codeHash");

-- CreateIndex
CREATE INDEX "appointment_codes_active_idx" ON "appointment_codes"("active");

-- CreateIndex
CREATE INDEX "appointment_codes_appointmentId_active_idx" ON "appointment_codes"("appointmentId", "active");

-- CreateIndex
CREATE INDEX "system_settings_updatedAt_idx" ON "system_settings"("updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "qr_codes_version_key" ON "qr_codes"("version");

-- CreateIndex
CREATE INDEX "qr_codes_active_generatedAt_idx" ON "qr_codes"("active", "generatedAt");

-- CreateIndex
CREATE INDEX "audit_logs_entityType_entityId_occurredAt_idx" ON "audit_logs"("entityType", "entityId", "occurredAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_occurredAt_idx" ON "audit_logs"("actorUserId", "occurredAt");

-- AddForeignKey
ALTER TABLE "priests" ADD CONSTRAINT "priests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "availabilities" ADD CONSTRAINT "availabilities_priestId_fkey" FOREIGN KEY ("priestId") REFERENCES "priests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_priestId_fkey" FOREIGN KEY ("priestId") REFERENCES "priests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "blocked_slots" ADD CONSTRAINT "blocked_slots_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_priestId_fkey" FOREIGN KEY ("priestId") REFERENCES "priests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_codes" ADD CONSTRAINT "appointment_codes_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_settings" ADD CONSTRAINT "system_settings_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_codes" ADD CONSTRAINT "qr_codes_generatedById_fkey" FOREIGN KEY ("generatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
