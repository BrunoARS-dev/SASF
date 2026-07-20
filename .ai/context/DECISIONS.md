# Decisions

| ID | Decisão | Estado |
| --- | --- | --- |
| DEC-001 | Fiel sem login; código privado é a chave pública do agendamento. | Validada |
| DEC-002 | Fiel não escolhe padre; sistema atribui padre elegível. | Validada |
| DEC-003 | Dados espirituais sensíveis não são coletados ou armazenados. | Validada |
| DEC-004 | Capacidade do slot é uma pessoa; reserva é atômica. | Validada |
| DEC-005 | Prazo, janela, encaixe, recuperação e comprovante são configuráveis. | Validada |
| DEC-006 | Configurações só afetam novas operações; não quebram reservas existentes. | Validada |
| DEC-007 | Operação interna segue menor privilégio e auditoria. | Validada |
| DEC-008 | Interface prioriza mobile, idosos e baixa literacia digital. | Validada |
| DEC-009 | `.ai/` é fonte oficial; `.agents/` é camada técnica mínima, sem duplicação e subordinada a `.ai/`. | Validada |
| DEC-010 | QR Code público aponta somente para a rota de agendamento; não contém dados pessoais ou de agendamento. | Validada |
| DEC-011 | Auth do MVP é exclusivo para gestores com username ou e-mail + senha, sessão em cookie HttpOnly de 8h, usuário inativo bloqueado e RBAC nos endpoints internos. | Validada |
