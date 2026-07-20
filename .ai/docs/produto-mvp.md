# SASF — Especificação de Produto MVP (IA-first)
## Escopo

- QR Code público: direciona somente para a rota de agendamento; gestor visualiza, baixa PNG/PDF e regenera; sem PII ou dados de agendamento.

| Item | Definição |
| --- | --- |
| Produto | Agendamento de confissões para uma igreja. |
| Público | Mobile-first; idosos; pessoas com baixa familiaridade digital. |
| Objetivo | Reservar horários sem conflito e com privacidade. |
| Stack alvo | Monorepo: Next.js/React/TS/Tailwind; NestJS/TS; PostgreSQL/Prisma; `apps/web`, `apps/api`, `packages/shared`. |
| Fora do MVP | Login do fiel; escolha de padre; listas públicas; notificações; pagamentos; multiunidade; lista de espera; dados espirituais. |
## Princípios obrigatórios

- Performance, privacidade, simplicidade e mobile-first são requisitos funcionais.
- Priorizar Server Components; Client Components somente quando necessários.
- Toda listagem interna tem paginação ou limite explícito.
- Sem visual de dashboard corporativo ou IA genérica.
- Não coletar: motivo, pecados, conteúdo espiritual, observações religiosas sensíveis.
- A existência do agendamento é dado privado.
- Soft delete/inativação: agendamentos, padres, usuários internos, disponibilidades, bloqueios.

## Perfis e permissões

| Perfil | Pode | Não pode |
| --- | --- | --- |
| Administrador | Usuários internos, papéis, padres, configurações, relatórios agregados. | Conteúdo espiritual (inexistente). |
| Secretaria | Agenda autorizada; criar, cancelar, reagendar; encaixes; bloqueios; realizado/ausente; configurações quando autorizada. | Guardar notas religiosas sensíveis. |
| Padre | Própria agenda e agenda do dia; realizado/ausente. | Ver agenda de outro padre. |
| Fiel | Agendar, consultar, alterar, cancelar por código privado; recuperar código. | Login; buscas/listas públicas; escolher padre. |
## Módulos do MVP

| Módulo | Função | Dependências |
| --- | --- | --- |
| Configurações do Sistema | Parâmetros operacionais; padres, duração, disponibilidade, bloqueios e fuso horário. | Administrador ou secretaria autorizada. |
| Disponibilidade pública | Dias/slots dos próximos 30 dias; ocupado aparece desabilitado e anônimo. | Configurações. |
| Reserva pública | Dados mínimos, validação, atribuição automática de padre, reserva atômica. | Disponibilidade. |
| Código/comprovante | Gera, copia, baixa comprovante, revoga e valida código. | Reserva. |
| Gestão pública | Consulta, alteração e cancelamento exclusivamente por código. | Código. |
| Recuperação | Telefone + último sobrenome + data; reemite código sem enumerar. | Código, dados mínimos. |
| Agenda operacional | Visões autorizadas para secretaria e padre. | Reserva, acesso interno. |
| Operação | Encaixe, bloqueio, confirmação, ausência. | Agenda. |
| Auditoria/observabilidade | Ator, ação, data/hora, entidade; métricas e erros sem dados sensíveis. | Todas as mutações. |
### Configurações do Sistema

| Parâmetro | Padrão | Regra |
| --- | --- | --- |
| Antecedência mínima para agendar | `2h` | Valida reserva pública. |
| Prazo mínimo para cancelar | `24h` | Valida cancelamento/alteração pública. |
| Janela máxima de agendamento | `30 dias` | Limita datas disponíveis ao fiel. |
| Encaixe manual | Permitido | Habilita ou bloqueia encaixes da secretaria. |
| Recuperação de código | Permitida | Habilita ou bloqueia o fluxo público de recuperação. |
| Emissão de comprovante | Opcional e permitida | Habilita ou bloqueia cópia/download após reserva. |
| Duração padrão de atendimento | A definir pela igreja | Base para padres sem duração específica. |
| Duração por padre | Opcional | Substitui a duração padrão quando configurada. |

- Alteração: somente administrador ou secretaria com permissão explícita; pelo painel gestor.
- Auditoria obrigatória: ator, parâmetro, valor anterior, novo valor, data/hora.
- Parâmetros são regras de negócio configuráveis; não podem ser valores fixos no código.
- Backend valida todos os parâmetros e os aplica a novas operações.
- Alterações não quebram ou recalculam agendamentos já criados.
## Regras de negócio
### Disponibilidade e reserva

1. Capacidade de cada slot: `1`.
2. Slot = disponibilidade ativa do padre + duração configurada por padre.
3. Fiel possui no máximo `1` agendamento futuro ativo (`AGENDADO`).
4. Fiel não escolhe padre; sistema escolhe padre elegível por política determinística e equilibrada.
5. Elegível = padre ativo + disponível + não bloqueado + slot livre.
6. Antecedência mínima e janela pública usam os parâmetros vigentes; padrões `2h` e `30 dias`.
7. Janela é calculada no fuso da igreja.
8. Bloqueio vence disponibilidade; reserva ativa vence nova reserva.
9. Criar/reagendar reserva deve ser atômico; nunca permitir dupla ocupação.
10. Mudança de configuração não altera agendamentos já confirmados.
### Status

| Status | Transições | Regra |
| --- | --- | --- |
| `AGENDADO` | `CANCELADO`, `PENDENTE_CONFIRMACAO` | Reserva futura válida. |
| `CANCELADO` | — | Slot liberado; não reativar. |
| `PENDENTE_CONFIRMACAO` | `REALIZADO`, `AUSENTE` | Criado automaticamente após fim do horário. |
| `REALIZADO` | — | Final. |
| `AUSENTE` | — | Final. |
### Alteração e cancelamento

- Fiel: alterar/cancelar até o prazo mínimo configurado (padrão `24h`), com código válido.
- Secretaria: alterar/cancelar a qualquer momento, com auditoria.
- Reagendamento: validar e reservar novo slot antes de liberar o atual.
- Falha no reagendamento: conservar reserva original.
- Encaixe: secretaria apenas, quando permitido; deve respeitar capacidade no MVP.
- Ações públicas bloqueadas após o início do atendimento.

### Código privado e recuperação

- Chave pública exclusiva: código privado; nunca buscar por nome, telefone, data ou padre.
- Formato não sequencial, aleatório criptograficamente, alta entropia; exemplo: `CONF-A8K2P7XQ`.
- Controles: rate limit, atrasos, mensagens neutras, auditoria.
- Apenas um código ativo por agendamento.
- Recuperação: habilitada somente quando permitida; usa telefone + último sobrenome + data.
- Exatamente um resultado: invalidar código anterior e gerar outro.
- Zero ou mais de um resultado: não confirmar existência; orientar a secretaria; não listar resultados.

### Privacidade e auditoria

- Proibir listas/telas públicas de agenda, quantidade agendada ou histórico.
- Não expor nome, telefone, padre ou detalhes de terceiros em disponibilidade.
- Auditar: criação, alteração, cancelamento, bloqueio, confirmação, ausência e parâmetros; ator + data/hora + entidade.
- Logs/métricas não incluem código privado, PII integral ou conteúdo sensível.
- Definir antes da produção: política LGPD, base legal, retenção, canal de direitos do titular, backups e recuperação.

## Casos de uso e aceite

| ID | Caso | Aceite mínimo |
| --- | --- | --- |
| UC-01 | Encontrar horário | Até a janela configurada; datas rápidas; slots ocupados anônimos/desabilitados; respeita antecedência. |
| UC-02 | Agendar | Dados mínimos; um futuro ativo; padre automático; reserva atômica; código + aviso obrigatório. |
| UC-03 | Consultar | Somente por código; retorna apenas dados do próprio agendamento; erro neutro. |
| UC-04 | Alterar/cancelar | Código válido; prazo configurado; alteração atômica; cancelamento auditado. |
| UC-05 | Recuperar código | Três fatores; reemite só com um resultado; zero/múltiplos não revelam nada; rate limit. |
| UC-06 | Operar agenda | Secretaria cria/altera/cancela/bloqueia/encaixa; acesso restrito e auditado. |
| UC-07 | Confirmar | Vencido vira pendente; padre só confirma sua agenda; secretaria confirma agenda autorizada. |
| UC-08 | Administrar | Gerir papéis, padres, disponibilidade e parâmetros; inativar sem apagar histórico. |

## Fluxos essenciais

### Agendamento público

1. Selecionar data → horário livre → dados mínimos → confirmar.
2. Revalidar regras e reservar atomically.
3. Atribuir padre sem expor escolha.
4. Quando comprovante for permitido: exibir código, cópia/download e aviso obrigatório.

### Gestão pública

1. Informar código → validar → mostrar somente dados próprios.
2. Alterar: escolher novo slot → reservar novo → liberar anterior.
3. Cancelar: validar janela → `CANCELADO` → liberar slot.

### Recuperação

1. Telefone + último sobrenome + data → rate limit → busca interna.
2. Um resultado: revogar e emitir código.
3. Zero/múltiplos: resposta neutra e contato com secretaria.

### Operação diária

1. Usuário interno autentica → abre agenda autorizada.
2. Pós-horário: `PENDENTE_CONFIRMACAO`.
3. Padre/secretaria: `REALIZADO` ou `AUSENTE` → auditoria.

## Requisitos não funcionais

| Área | Requisitos |
| --- | --- |
| Acessibilidade | Fonte legível, contraste, botões grandes, toque adequado, formulários curtos, teclado, foco visível, leitor de tela, sem depender só de cor. |
| Performance | Conexão móvel comum; troca de data percebida como imediata; pouco JS público; consultas limitadas/paginadas. |
| Segurança | HTTPS; autenticação forte interna; RBAC em toda ação; segredos fora do código; proteção brute force/enumeração. |
| Confiabilidade | Reservas/reagendamentos transacionais e idempotentes; fuso único; rotina de vencidos; backup/recuperação monitorados. |

## Roadmap e dependências

| Fase | Entrega | Pré-requisito |
| --- | --- | --- |
| 0 | Decidir fuso, dados mínimos, retenção, aviso LGPD, política de padre, suporte. | — |
| 1 | Acesso interno, papéis, padres, disponibilidade, bloqueios, duração, prazo. | Fase 0 |
| 2 | Slots, reservas atômicas, agenda interna, testes de concorrência/data. | Fase 1 |
| 3 | Autoatendimento, código, comprovante, recuperação, teste com idosos. | Fase 2 |
| 4 | Confirmação, auditoria, relatórios agregados, observabilidade, homologação. | Fase 3 |
| 5 | Piloto limitado, suporte, métricas, ajustes e abertura. | Fase 4 |

## Riscos e mitigação

| Risco | Mitigação |
| --- | --- |
| Exposição de agendamentos | Código forte; respostas neutras; sem buscas/listas; rate limit. |
| Dupla reserva | Transação, unicidade e revalidação final. |
| Exclusão digital | Fluxo curto; testes presenciais; atendimento assistido pela secretaria. |
| Dados sensíveis em texto livre | Não oferecer campo livre ao fiel; treinamento interno. |
| Configuração errada | Prévia, auditoria, revisão e piloto. |
| Acesso interno excessivo | RBAC, contas individuais, revisão periódica, logs. |

## Pós-MVP condicionado à revisão de privacidade

- Lembretes opt-in sem detalhe sensível.
- Lista de espera privada para secretaria.
- Feriados e exceções recorrentes.
- Multiunidade com isolamento rigoroso.
- Relatórios agregados anti-reidentificação.
- Fonte ampliada, alto contraste e suporte assistido.

## Documentos futuros

```text
docs/
  produto-mvp.md
  decisoes/{atribuicao-padre,dados-retencao,codigo-privado}.md
  operacao/{manual-secretaria,manual-padre,plano-piloto}.md
  conformidade/{aviso-privacidade,matriz-acesso,retencao}.md
  qualidade/{plano-testes,acessibilidade,modelo-ameacas}.md
```
