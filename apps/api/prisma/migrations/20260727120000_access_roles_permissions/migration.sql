CREATE TABLE "access_roles" (
    "key" "UserRole" NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "description" VARCHAR(180),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "access_roles_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "permissions" (
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "group" VARCHAR(80) NOT NULL,
    "description" VARCHAR(180),
    CONSTRAINT "permissions_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "role_permissions" (
    "roleKey" "UserRole" NOT NULL,
    "permissionKey" VARCHAR(100) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("roleKey", "permissionKey")
);

ALTER TABLE "priests" ALTER COLUMN "userId" DROP NOT NULL;

CREATE INDEX "permissions_group_idx" ON "permissions"("group");
CREATE INDEX "role_permissions_permissionKey_idx" ON "role_permissions"("permissionKey");

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_roleKey_fkey"
FOREIGN KEY ("roleKey") REFERENCES "access_roles"("key")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "role_permissions"
ADD CONSTRAINT "role_permissions_permissionKey_fkey"
FOREIGN KEY ("permissionKey") REFERENCES "permissions"("key")
ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "access_roles" ("key", "name", "description", "updatedAt") VALUES
('ADMIN', 'Administrador', 'Acesso administrativo completo.', CURRENT_TIMESTAMP),
('SECRETARIA', 'Secretaria', 'Operação da agenda e cadastros.', CURRENT_TIMESTAMP),
('PADRE', 'Padre', 'Consulta e atualização dos próprios atendimentos.', CURRENT_TIMESTAMP);

ALTER TABLE "users"
ADD CONSTRAINT "users_role_fkey"
FOREIGN KEY ("role") REFERENCES "access_roles"("key")
ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "permissions" ("key", "name", "group", "description") VALUES
('dashboard.view', 'Visualizar dashboard', 'Visão geral', 'Acessar indicadores estratégicos.'),
('agenda.view', 'Visualizar agenda', 'Agenda', 'Consultar a agenda permitida para a função.'),
('agenda.create_manual', 'Criar agendamento manual', 'Agenda', 'Criar encaixes pela área interna.'),
('agenda.cancel', 'Cancelar agendamento', 'Agenda', 'Cancelar atendimentos futuros.'),
('agenda.delete', 'Excluir agendamento', 'Agenda', 'Excluir registros já cancelados.'),
('agenda.mark_attendance', 'Confirmar presença ou ausência', 'Agenda', 'Finalizar atendimentos realizados ou ausentes.'),
('settings.manage', 'Gerenciar configurações', 'Configurações', 'Alterar parâmetros operacionais.'),
('priest.view', 'Visualizar padres', 'Padres', 'Consultar perfis operacionais de padres.'),
('priest.manage', 'Gerenciar padres', 'Padres', 'Criar e editar perfis de padres.'),
('priest.delete', 'Excluir padre', 'Padres', 'Remover perfis operacionais de padres.'),
('availability.manage', 'Gerenciar disponibilidades', 'Disponibilidades', 'Criar e alterar grades de atendimento.'),
('blocked_slot.manage', 'Gerenciar bloqueios', 'Bloqueios', 'Criar e alterar bloqueios de agenda.'),
('qrcode.manage', 'Gerenciar QR Code', 'QR Code', 'Consultar e imprimir o QR Code público.'),
('user.manage', 'Gerenciar usuários', 'Usuários e acessos', 'Criar, editar e desativar contas.'),
('role.manage', 'Gerenciar funções e permissões', 'Usuários e acessos', 'Alterar privilégios associados às funções.');
INSERT INTO "permissions" ("key", "name", "group", "description") VALUES
('audit.view', 'Visualizar auditoria', 'Auditoria', 'Consultar o histórico de ações administrativas.');

INSERT INTO "role_permissions" ("roleKey", "permissionKey")
SELECT 'ADMIN', "key" FROM "permissions";

INSERT INTO "role_permissions" ("roleKey", "permissionKey") VALUES
('SECRETARIA', 'dashboard.view'),
('SECRETARIA', 'agenda.view'),
('SECRETARIA', 'agenda.create_manual'),
('SECRETARIA', 'agenda.cancel'),
('SECRETARIA', 'agenda.delete'),
('SECRETARIA', 'agenda.mark_attendance'),
('SECRETARIA', 'settings.manage'),
('SECRETARIA', 'priest.view'),
('SECRETARIA', 'priest.manage'),
('SECRETARIA', 'priest.delete'),
('SECRETARIA', 'availability.manage'),
('SECRETARIA', 'blocked_slot.manage'),
('SECRETARIA', 'qrcode.manage'),
('PADRE', 'dashboard.view'),
('PADRE', 'agenda.view'),
('PADRE', 'agenda.mark_attendance');
