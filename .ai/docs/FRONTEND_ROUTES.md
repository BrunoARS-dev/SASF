# Frontend Routes

```text
app/
  page.tsx                       # redireciona para /agendar
  agendar/page.tsx               # data, slot, dados minimos
  consultar/page.tsx             # consulta e cancelamento por codigo privado
  recuperar-codigo/page.tsx      # telefone, ultimo sobrenome, data
  agendamento/confirmado/page.tsx # confirmacao, copiar codigo, comprovante simples
  login/page.tsx                 # login visual dos gestores
  gestor/page.tsx                # inicio do painel gestor
  gestor/agenda/page.tsx
  gestor/configuracoes/page.tsx
  gestor/padres/page.tsx
  gestor/disponibilidades/page.tsx
  gestor/bloqueios/page.tsx
  gestor/qrcode/page.tsx
```

## Publico do fiel

| Rota | Status | Observacoes |
| --- | --- | --- |
| `/agendar` | implementado | barra horizontal de dias, calendario reduzido, horarios desabilitados, formulario curto |
| `/consultar` | implementado | consulta por codigo e cancelamento pelo mesmo codigo |
| `/recuperar-codigo` | implementado | resposta neutra; mostra novo codigo apenas quando a API retornar match unico |
| `/agendamento/confirmado` | implementado | le confirmacao temporaria de `sessionStorage`, copia codigo e imprime comprovante simples |

## Interno gestor

| Rota | Status | Observacoes |
| --- | --- | --- |
| `/login` | implementado | username ou e-mail + senha; cookie HttpOnly via backend |
| `/gestor` | implementado | shell gestor protegido e navegacao por perfil |
| `/gestor/agenda` | implementado | agenda do dia e acoes realizado/ausente |
| `/gestor/configuracoes` | implementado | ADMIN/SECRETARIA; edicao de settings validados |
| `/gestor/padres` | implementado | ADMIN/SECRETARIA; criar, editar, ativar/desativar e remover |
| `/gestor/disponibilidades` | implementado | ADMIN/SECRETARIA; criar, editar, ativar/desativar e remover |
| `/gestor/bloqueios` | implementado | ADMIN/SECRETARIA; criar, ativar/desativar e remover |
| `/gestor/qrcode` | implementado parcial | ADMIN/SECRETARIA; gera versao e link publico |

## Regras de renderizacao

| Area | Padrao | Client somente para |
| --- | --- | --- |
| Publica | Server Components para paginas e shell | selecao de data/slot, formularios, copia e impressao |
| Interna | Server Components com redirect para `/login` quando sem sessao | login/logout e shells interativos |
| QR | Rota publica fixa `/agendar` | imagem QR escaneavel/download PNG/PDF fica para etapa futura |

## Integracao

- O browser chama route handlers do Next em `/api/public/*`.
- Os route handlers encaminham para a API backend usando `API_URL` no servidor.
- Nenhum endpoint publico retorna padre.
- Nenhuma tela publica usa login.
- Codigo privado nao e salvo em `localStorage`; a confirmacao usa `sessionStorage` apenas para navegar ate `/agendamento/confirmado`.
- Comprovante simples usa impressao do navegador, sem dependencia pesada.
- O browser chama route handlers do Next em `/api/auth/*` para login, session e logout.
- Os route handlers de auth preservam o cookie HttpOnly emitido/limpo pelo backend.
- Token de sessao nao e salvo em `localStorage`.

## Pendencias

- Validar visualmente em desktop e mobile com Browser/Playwright e API rodando.
- Ajustar textos finais com a operacao paroquial antes do piloto.

## Validacao atual

- Dependencias do workspace web instaladas.
- `npm run typecheck --workspace=@sasf/web` passou.
- `npm run build --workspace=@sasf/web` passou.
- Smoke HTTP local passou em `/agendar`, `/consultar`, `/recuperar-codigo` e `/agendamento/confirmado`.
- `API_URL` esta documentado em `apps/web/.env.example`.
- Proxies `/api/public/*` encaminham apenas rotas publicas fixas da API e nao definem endpoints de padre, senha, hash ou dados internos.
- Build do web passou com `/login`, `/gestor` e rotas gestoras dinamicas.
- Bloco gestor operacional implementado com route handlers em `/api/internal/*` preservando cookie HttpOnly.
