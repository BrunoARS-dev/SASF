# Architecture

| Camada | Definição |
| --- | --- |
| Repositório | Monorepo. |
| Web | Next.js + React + TypeScript + Tailwind CSS. |
| API | NestJS + TypeScript. |
| Dados | PostgreSQL + Prisma ORM. |
| Pastas alvo | `apps/web`, `apps/api`, `packages/shared`. |
| Fundação IA | `.ai/` é fonte oficial; `.agents/` contém apenas artefatos técnicos de descoberta. |

## Diretrizes

- Frontend: Server Components por padrão; Client Components somente quando necessários.
- API: autenticação interna, RBAC e validação no backend.
- Dados: reserva/reagendamento transacionais; soft delete/inativação.
- Segurança: HTTPS, rate limit, códigos com alta entropia, logs sem PII integral/código.
- Configurações: regras persistidas para novas operações; não hardcode.
- Fuso horário: único e explícito, definido pela igreja.
- Codex: `.agents/skills` e `.agents/plugins` são caminhos técnicos auto-descobertos; documentação vive em `.ai/`.
- Agents/subagents não são descobertos por pasta `.agents`; são recursos da sessão/Codex.
