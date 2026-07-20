# Lessons Learned

| Situacao | Regra aplicada |
| --- | --- |
| Dado sensivel por contexto | Nao coletar/inferir conteudo espiritual. |
| Baixa literacia digital | Fluxos curtos e suporte assistido. |
| Codigo privado | Alta entropia, hash no banco, rate limit e resposta neutra. |
| Concorrencia de agenda | Validar no backend e reservar atomicamente. |
| Regras operacionais variaveis | Configurar, auditar e nao fixar no codigo. |
| Fundacao IA | `.ai/` e fonte oficial; agents/skills referenciam contexto, sem duplicacao. |
| Descoberta Codex | `.agents/` e camada tecnica minima para skills/plugins; nao define subagents automaticamente. |
| Base tecnica | Workspaces npm, TypeScript estrito e App Router/Nest minimos antes de logica de negocio. |
| Backend base | Controllers iniciais devem ser stubs seguros; regras transacionais entram so apos Prisma/migration validados. |
| API publica | Nunca criar listagem publica de fieis, agenda completa, padre ou historico. |
| Recuperacao de codigo | Sem canal externo, so reemitir codigo quando houver match unico e manter mensagem neutra. |
| Disponibilidade publica | Retornar apenas dias/horarios, nunca padre ou agenda completa. |
| Slot cancelado | Constraint de slot deve ser parcial para status ativo; unique simples bloqueia reaproveitamento apos cancelamento. |
| Concorrencia real | Check-then-create precisa de transacao serializavel e constraint no banco para nao virar corrida em PostgreSQL. |
| Auditoria segura | Registrar apenas metadata operacional; filtrar codigo, hash, telefone, nome, senha, token, segredo e motivo. |
| Fluxos publicos sensiveis | Criacao, consulta por codigo, cancelamento por codigo e recuperacao exigem throttling real. |
| Frontend publico do fiel | Usar Server Components para paginas e Client Components apenas nos formularios/seletores interativos. |
| Codigo no frontend | Nao usar `localStorage`; confirmacao pode usar `sessionStorage` temporario para nao colocar codigo na URL. |
