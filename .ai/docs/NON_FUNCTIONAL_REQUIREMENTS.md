# Non-Functional Requirements

| Área | Requisitos |
| --- | --- |
| UX | Mobile-first; fonte legível; contraste; botões grandes; poucos campos; linguagem simples. |
| Acessibilidade | Teclado, foco visível, semântica, leitor de tela, sem depender apenas de cor. |
| Performance | Pouco JS público; datas/slots rápidos; listagens limitadas ou paginadas. |
| Segurança | HTTPS; autenticação forte interna; RBAC; rate limit; segredo fora do código. |
| Privacidade | Coleta mínima; sem conteúdo espiritual; sem listas públicas; logs sem PII integral/código. |
| Confiabilidade | Reserva transacional/idempotente; fuso único; rotina de vencidos; backup e recuperação. |
| Manutenção | Parâmetros configuráveis; mudanças auditadas; sem dependências ou abstrações desnecessárias. |
