# Modules

| Módulo | Responsabilidade | Dependência |
| --- | --- | --- |
| Configurações do Sistema | Parâmetros, padres, disponibilidade, bloqueios e fuso. | Acesso interno. |
| Disponibilidade pública | Dias e slots anônimos e limitados. | Configurações. |
| QR Code público | Rota pública; visualização, PNG/PDF e regeneração por gestor. | Rota pública e acesso interno. |
| Reserva pública | Dados mínimos, atribuição de padre, reserva atômica. | Disponibilidade. |
| Código e comprovante | Código privado, cópia/download, revogação. | Reserva; parâmetro de comprovante. |
| Gestão pública | Consulta, alteração e cancelamento por código. | Código. |
| Recuperação de código | Reemissão privada e anti-enumeração. | Código; parâmetro de recuperação. |
| Agenda operacional | Visões autorizadas de secretaria e padre. | Reserva e RBAC. |
| Operação diária | Encaixe, bloqueio, realizado, ausente. | Agenda e parâmetros. |
| Auditoria/observabilidade | Rastreamento técnico e operacional seguro. | Todas as mutações. |
