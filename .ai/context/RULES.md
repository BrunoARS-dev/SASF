# Rules

- Slot: capacidade `1`; reserva/reagendamento atômico.
- Fiel: máximo de um agendamento futuro ativo (`AGENDADO`).
- Padre: atribuição automática; elegível se ativo, disponível, desbloqueado e com slot livre.
- Janela, antecedência e cancelamento usam parâmetros vigentes; padrões: `30 dias`, `2h`, `24h`.
- Bloqueio vence disponibilidade; reserva ativa vence nova reserva.
- Status: `AGENDADO → CANCELADO|PENDENTE_CONFIRMACAO → REALIZADO|AUSENTE`.
- Ação pública exige código privado; sem busca/listagem por nome, telefone, data ou padre.
- Recuperação: telefone + último sobrenome + data; só um resultado reemite código; resposta neutra nos demais casos.
- Fiel altera/cancela conforme prazo; secretaria opera a qualquer momento.
- Encaixe, recuperação e comprovante obedecem às configurações.
- QR Code é público e aponta apenas para a rota de agendamento; sem PII, dados de agendamento ou conteúdo sensível.
- Administrador/secretaria autorizada pode visualizar, baixar PNG/PDF e regenerar QR Code.
- Não persistir motivo, pecados, conteúdo espiritual ou notas religiosas sensíveis.
- Soft delete/inativação e auditoria para entidades/mutações operacionais.
