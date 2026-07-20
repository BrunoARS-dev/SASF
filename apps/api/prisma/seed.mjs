import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const scrypt = promisify(scryptCallback);

const settings = [
  ['minimum_booking_lead_hours', '2', 'INTEGER', 'Antecedencia minima para agendamento pelo fiel.'],
  ['minimum_cancellation_lead_hours', '24', 'INTEGER', 'Prazo minimo para cancelamento pelo fiel.'],
  ['booking_window_days', '30', 'INTEGER', 'Janela maxima de dias disponiveis para agendamento.'],
  ['manual_override_enabled', 'true', 'BOOLEAN', 'Permite encaixe manual pela operacao autorizada.'],
  ['code_recovery_enabled', 'true', 'BOOLEAN', 'Permite recuperacao de codigo privado.'],
  ['receipt_enabled', 'true', 'BOOLEAN', 'Permite emissao opcional de comprovante.'],
  ['default_appointment_duration_minutes', '30', 'INTEGER', 'Duracao padrao inicial de atendimento.'],
  ['timezone', 'America/Sao_Paulo', 'STRING', 'Fuso horario operacional do sistema.'],
];

for (const [key, value, valueType, description] of settings) {
  await prisma.systemSetting.upsert({
    where: { key },
    update: { value, valueType, description },
    create: { key, value, valueType, description },
  });
}

await prisma.user.upsert({
  where: { email: 'admin@sasf.local' },
  update: {
    username: 'admin',
    active: true,
    role: 'ADMIN',
  },
  create: {
    name: 'Administrador SASF',
    username: 'admin',
    email: 'admin@sasf.local',
    passwordHash: await hashPassword('Admin123!'),
    role: 'ADMIN',
    active: true,
  },
});

const priestUser = await prisma.user.upsert({
  where: { email: 'padre@sasf.local' },
  update: {
    username: 'padre',
    active: true,
    role: 'PADRE',
  },
  create: {
    name: 'Padre Teste',
    username: 'padre',
    email: 'padre@sasf.local',
    passwordHash: await hashPassword('Padre123!'),
    role: 'PADRE',
    active: true,
  },
});

const priest = await prisma.priest.upsert({
  where: { userId: priestUser.id },
  update: {
    name: 'Padre Teste',
    active: true,
    appointmentDurationMin: 30,
    deletedAt: null,
  },
  create: {
    userId: priestUser.id,
    name: 'Padre Teste',
    active: true,
    appointmentDurationMin: 30,
  },
});

for (let dayOfWeek = 0; dayOfWeek <= 6; dayOfWeek += 1) {
  const existing = await prisma.availability.findFirst({
    where: {
      priestId: priest.id,
      dayOfWeek,
      deletedAt: null,
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.availability.update({
      where: { id: existing.id },
      data: {
        startTime: timeOnly(9, 0),
        endTime: timeOnly(17, 0),
        active: true,
      },
    });
    continue;
  }

  await prisma.availability.create({
    data: {
      priestId: priest.id,
      dayOfWeek,
      startTime: timeOnly(9, 0),
      endTime: timeOnly(17, 0),
      active: true,
    },
  });
}

await prisma.qrCode.upsert({
  where: { version: 1 },
  update: {
    publicPath: '/agendar',
    active: true,
  },
  create: {
    publicPath: '/agendar',
    version: 1,
    active: true,
  },
});

await prisma.$disconnect();

async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url');
  const derivedKey = await scrypt(password, salt, 64, {
    N: 16384,
    r: 8,
    p: 1,
  });

  return ['scrypt', 16384, 8, 1, salt, derivedKey.toString('base64url')].join('$');
}

function timeOnly(hour, minute) {
  return new Date(Date.UTC(1970, 0, 1, hour, minute, 0));
}
