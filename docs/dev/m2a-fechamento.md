# M2-A — relatório de fechamento: fundação de autenticação e sessões

Registro local de 11/11/2026. Primeiro lote do M2 do Brain: substituir apenas a identidade da
demonstração por fundação real, preservando a UI aprovada. **Nada foi publicado, implantado,
enviado ou conectado a serviços externos.**

> O M1 continua sem aceite humano formal, com as ressalvas de
> [`m1-fechamento.md`](m1-fechamento.md). O usuário autorizou este lote explicitamente e **aceitou o
> M2-A em 11/11/2026**; isso não transforma o M1 em aceito nem autoriza M2-B/C, M3–M5, deploy ou push.

## 1. Estado final e reprodução

### 1.1 O que funciona de verdade agora

- PostgreSQL 17.6 local com schema gerenciado por Drizzle e migrações versionadas.
- Fastify servindo `/api` e a SPA na mesma origem em produção.
- Better Auth 1.7.21 com adapter Drizzle, somente email/senha.
- Bootstrap protegido do primeiro usuário, token de uso único e cadastro público fechado.
- Login/logout reais, sessão persistida no banco e cookie opaco.
- Política própria de sessão por confiança:
  - não confiável: 15 min de inatividade / 1 h absoluta;
  - confiável: 30 dias de inatividade / 90 dias absolutos;
  - vence o primeiro limite; atividade explícita nunca passa do teto.
- Lista/revogação das próprias sessões e dispositivos, confiança opt-in e revogável.
- Reautenticação por senha e troca de senha com revogação de outras sessões/confianças.
- Sessões e setup sobrevivem ao restart da API; banco indisponível falha fechado com 503.

### 1.2 O que continua demonstrativo

Projetos, worktrees, chat, filas, subagentes, issues, arquivos/editor/diff, PR/gates/merge,
terminal, preview, processos, cotas, consumo, conexões de provider, modos, MCP, voz, transcrição,
anexos, modelo/effort e custos continuam exatamente como no M1: fixtures em memória ou dados
ilustrativos, sem integração externa.

O banner foi ajustado para: **“Projetos em memória; login e sessões persistem.”** O selo
“auth real · projeto fictício” aparece em Configurações.

### 1.3 Como reproduzir no ambiente atual

Pré-requisitos observados: macOS, Node.js 24.9.0 para validação, PostgreSQL 17.6 (Homebrew). O host
também tem Node 25.2.1; a validação deste lote foi feita com 24.9.0.

```bash
npm install
npm run db:migrate
npm run setup:token      # imprime o token uma vez; guarde-o até concluir o setup
npm run dev:api          # API em 127.0.0.1:3000
npm run dev              # SPA em 127.0.0.1:5173
```

Abra `http://127.0.0.1:5173`, conclua `/setup` e entre em `/login`.

Variáveis: copie `.env.example` para `.env`. Neste host foram criados o role `brain` e os bancos
`brain_dev`/`brain_test` no PostgreSQL 17.6 já instalado; nenhum outro banco foi alterado. Não
publique a porta do PostgreSQL.

Scripts de teste:

```bash
npm run typecheck
npm run lint
npm test                 # 40 testes web
npm run test:server      # 16 testes Fastify/PostgreSQL
npm run build
npm run test:e2e         # 37 testes Playwright; usa API 3100 + Vite 5174 + brain_test
```

`npm run test:e2e` **trunca o banco de teste** no projeto de setup. Não aponte
`TEST_DATABASE_URL` para o banco de desenvolvimento.

### 1.4 Compose

`compose.yaml` e `Dockerfile` foram criados, com PostgreSQL sem porta publicada, API com migração
no entrypoint, healthcheck e `restart: unless-stopped`. **O caminho Compose não foi executado no
Mac**: o plugin `docker compose` não está instalado e o daemon configurado aponta para um host
remoto indisponível.

O caminho **Linux nativo** foi validado no servidor `jarvis`: Node 24.21, PostgreSQL 17.11,
systemd user service, build, testes web/servidor e Playwright. O `jarvis` não tem Docker; a operação
dele está em [`jarvis-operacao.md`](jarvis-operacao.md).

## 2. Arquitetura entregue

```text
shared/auth.ts                  contratos e prazos compartilhados
server/src/
  app.ts                        Fastify, parser JSON, cookies, rate limit, headers
  index.ts                      migração + listen + shutdown
  config.ts                     env validado por zod
  clock.ts                      relógio injetável (testes)
  db/
    schema/index.ts             auth + device + setup + throttle
    client.ts                   pool/drizzle
    migrate.ts                  advisory lock + migrator + seed do setup
  auth/
    auth.ts                     Better Auth e extensões
    policy.ts                   cálculo puro dos prazos
    device.ts                   token opaco, hash e cookie
    guard.ts                    sessão autoritativa + binding + origem
    throttle.ts                 falhas por email/IP
    routes/                     setup, login/logout/sessão, dispositivos/senha
  http/                         erros, cookies, origem, redaction
server/scripts/                 setup:token e reset-password
```

Nenhum workspace ou pacote vazio foi criado. `shared/` tem apenas contratos/constantes.

## 3. Decisões de segurança implementadas

### 3.1 Better Auth

- Versão fixada em **1.7.21**; adapter Drizzle 1.7.21.
- `disableSignUp: true`, `autoSignIn` e email/senha apenas.
- `disableSessionRefresh: true`: `get-session` não renova inatividade nem teto.
- `cookieCache.enabled = false` e sem storage secundário: revogação é lida no banco a cada request.
- `expiresIn` é apenas teto de transporte do cookie; a validade real está em
  `expiresAt`/`absoluteExpiresAt`.
- `rememberMe` é forçado no servidor; o body do cliente não decide confiança.
- Campos `deviceId`, `trusted`, `absoluteExpiresAt`, `lastAuthAt` e `lastActivityAt` usam
  `input: false`; escrita só pelo servidor.
- `disabledPaths` cobre signup, reset, update-session, list/revoke-session, change-email,
  change-password, delete-user e sign-out da biblioteca.
- **Nenhum handler `/api/auth/*` da biblioteca é montado.** Login/logout são rotas próprias; qualquer
  chamada direta a signup ou endpoints internos recebe 404. `auth.api` é usado internamente para
  sign-in/sign-out/verify/change.

### 3.2 Política de prazos

- Sessão recém-criada: `expiresAt = min(now + janela, createdAt + teto)`.
- `absoluteExpiresAt` é fixado no login e nunca alterado por atividade.
- `POST /api/auth/activity` é o único ponto que estende inatividade; aplica `LEAST` e tem throttle
  de 30 s no cliente e no servidor.
- Consulta de sessão, listagem, polling, heartbeat, SSE e job não renovam.
- Conceder confiança:
  - exige auth recente (10 min);
  - atualiza `trustedUntil` do dispositivo;
  - promove sessões ativas para 30 d/90 d mantendo o teto desde o login original.
- Revogar confiança/deslogar encerra as sessões do dispositivo e expira cookies.
- Troca de senha:
  - exige auth recente e confere a senha antes de revogar;
  - revoga outras sessões e confianças antes de trocar o hash;
  - mantém a sessão atual.

### 3.3 Cookies, CSRF e proxy

- Sessão e dispositivo: `HttpOnly`, `SameSite=Lax`, `Secure` quando HTTPS, `Path=/`, host-only.
- Cookie de dispositivo guarda token opaco; o banco guarda SHA-256. A sessão exige o cookie de
  dispositivo correspondente (`DEVICE_MISMATCH` sem ele).
- Como rotas próprias chamam `auth.api` diretamente, toda mutação valida `Origin` exato,
  `Sec-Fetch-Site` e `Content-Type`. O handler da biblioteca, que faria essas checagens, não é
  montado.
- `trustProxy` só liga com lista explícita de proxies; o header de IP usado pelo Better Auth é
  sobrescrito por `request.ip`.
- Em produção, API e SPA devem estar na mesma origem; não há CORS.

### 3.4 Bootstrap, signup e recuperação

- `/api/setup/bootstrap` exige token de 32 bytes, hash no banco, TTL de 24 h e transação com
  `SELECT ... FOR UPDATE` na linha singleton.
- 20 tentativas concorrentes produziram 1 usuário e 19 respostas 409.
- Após concluído, bootstrap responde 409 e `/api/auth/sign-up/email` responde 404.
- Recuperação de acesso é somente CLI local:
  `npm run auth:reset-password -- --email <email>` (TTY sem eco, ou `--password-stdin`).
  Ela troca o hash, revoga todas as sessões e confianças; não existe endpoint público de reset.

### 3.5 Logs e segredos

- Fastify sem body logging e com redaction de `cookie`, `authorization` e `set-cookie`.
- Better Auth loga somente mensagem, sem argumentos/credenciais.
- Erros HTTP não devolvem stack, SQL ou tokens; retornam código, mensagem e request id.
- Token de setup não é logado nem persistido em claro.
- Senha nunca é logada; hash é scrypt padrão do Better Auth (mínimo 8 caracteres, decidido pelo
  usuário).

## 4. Correções e acabamentos desta rodada

- Conta real no menu: nome, email, estado de confiança, “Sessões e dispositivos” e logout.
- Nova aba Acesso ligada a dados reais, com prazos, dispositivo atual, confiança, revogação,
  reautenticação e troca de senha.
- Setup e login com foco, labels, `autocomplete`, mostrar/ocultar senha e mensagens de erro.
- Diálogo de sessão expirada mantém a árvore montada: rascunho do composer sobrevive à
  reautenticação (validado manualmente).
- Banner e textos deixam explícito que login/sessão são reais e o produto continua fictício.
- Tabs deixaram de esticar em largura total (`self-start`), preservando o visual aprovado.
- Configurações antigas de “credenciais desativadas” foram substituídas por “Conta e acesso” real.
- Links do menu da conta e testes E2E atualizados sem remover garantias das jornadas do M1.
- `m2a-*` capturas novas; evidências anteriores preservadas.

## 5. Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou (web + server + shared) |
| `npm run lint` | passou, sem avisos |
| `npm test` | **40 testes em 7 arquivos** |
| `npm run test:server` | **16 testes em 6 arquivos** |
| `npm run build` | passou; permanece o aviso de chunk >500 kB (>2,2 MB) |
| `npm run test:e2e` | **37 testes**: 1 setup + 30 desktop + 6 mobile |
| `npm start` (build compilado) | `/`, fallback SPA e `/api/health` responderam 200 |
| Jarvis / Linux nativo | Node 24.21, build, 40 web, 16 server e 37 E2E (`--workers=2`) passaram |
| Lighthouse `/login` | acessibilidade 100, boas práticas 100, SEO 100 |
| Lighthouse chat autenticado | acessibilidade 100, boas práticas 100, SEO 100 |
| Layout | 360/390/768/1024/1280/1440 em login, projetos, chat e Acesso; sem overflow |

Cobertura de servidor inclui: bootstrap concorrente, signup fechado, login/senha errada, logout,
origem rejeitada, binding de dispositivo, prazos 15 min/1 h e 30 d/90 d com relógio deslocado,
atividade limitada pelo teto, `get-session` sem refresh, revogação imediata, auth recente, troca de
senha, throttle por conta, banco indisponível com 503 e nova instância da API mantendo a sessão.

A suíte E2E cobre setup real pelo navegador, login obrigatório, signup direto 404, confiança
opt-in, lista/revogação de outra sessão e logout. As jornadas M1 continuam passando autenticadas.

## 6. Inspeção manual e evidências

Inspeção real no Chromium local:

- Setup, login e Acesso em desktop 1440×900 e mobile 390/360.
- Fluxo de expiração com relógio deslocado: diálogo sobre Configurações, re-login e rascunho do
  composer preservado.
- Revogação de sessão em segundo contexto de navegador.
- CLI de reset de senha: senha antiga passou a 401, nova passou a 200, sessões revogadas.
- Restart da API: login antes, processo encerrado/reiniciado, `GET /api/auth/session` continuou 200
  e `/api/setup/status` permaneceu `required:false`.

Capturas novas em `docs/dev/evidencias/` — **mantidas localmente e não versionadas**; um clone do
repositório não as contém e deve gerá-las/obtê-las à parte:

- `m2a-setup.png`
- `m2a-login.png`
- `m2a-projects.png`
- `m2a-settings-access.png`
- `m2a-settings-trusted.png`
- `m2a-desktop-access.png`
- `m2a-mobile-access.png`
- `m2a-mobile-360-access.png`
- `m2a-mobile-login.png`
- `m2a-session-expired.png`


## 7. Medições observadas (não são mínimos)

Ambiente: macOS, Node 24.9.0 para testes/build/E2E, PostgreSQL 17.6 Homebrew, banco de
desenvolvimento pequeno. A API de desenvolvimento usada em uma das medições foi iniciada pelo
runtime padrão do host (Node 25.2.1); o build compilado e a validação principal usaram 24.9.0.

| Medida | Observação |
| --- | --- |
| Login (5 amostras, API dev) | ~71–103 ms por requisição |
| API dev com `tsx` | RSS ~89 MB |
| PostgreSQL | bancos `brain_dev`/`brain_test` ~8,2 MB cada após poucos dados |
| Sessões no dev ao medir | 15 (dados de teste; limpas depois) |
| Compose | **não medido**: plugin/daemon indisponível |

Não há mínimo de RAM/CPU declarado. Scrypt sob concorrência real, Compose e instalação Linux ainda
precisam de medição no alvo.

## 8. O que continua simulado

| Área | Natureza |
| --- | --- |
| Projetos, worktrees, setup de projeto, arquivos | Fixtures; nada lido/escrito no host |
| Chat, agente, streaming, subagentes, filas | Simulador determinístico |
| Issues, PR, gates, merge, remoção | Estados fictícios; sem Git/GitHub |
| Terminal, preview, processos | Sem PTY/porta/processo real |
| Cotas, consumo, conexões, chaves | Exemplos/indisponíveis; sem provider |
| Voz, transcrição, anexos | Simulados/localmente |
| Modelo/effort | Ilustrativos |

O login é real; os dados de projeto não são. A UI separa os dois conceitos.

## 9. Pendências

**Bloqueantes:** nenhuma encontrada no lote implementado.

**Não bloqueantes:**

- Compose/Docker não validados; o `jarvis` usa caminho Linux nativo. `docker compose` não está
  instalado no Mac e não existe no jarvis.
- HTTPS/Tailscale Serve ainda não habilitado no jarvis; o acesso atual é HTTP privado na tailnet.
  Não usar como implantação pública.
- Reinício do PostgreSQL compartilhado não foi executado para não interromper outros bancos; a
  persistência foi provada com restart da API, com a sessão no banco e no serviço systemd do jarvis.
- Sem validação em telefone físico, teclado iOS/Android, leitor de tela manual, Firefox/WebKit ou
  zoom 200%/400%.
- HTTPS real, proxy do operador, Caddy e Tailscale não foram configurados/testados.
- Rate limit por IP do `@fastify/rate-limit` é em memória; reiniciar a API zera esse contador. O
  throttle por email/IP de login é persistido no banco.
- Aviso de chunk >500 kB no build.
- `npm audit` aponta 4 vulnerabilidades moderadas na cadeia de build do `drizzle-kit`
  (`esbuild` antigo); é tooling de desenvolvimento, não dependência de runtime da API. O zod foi
  atualizado para 4.6.7 e a vulnerabilidade alta de runtime deixou de aparecer.
- Sem ferramenta de backup/restauração; perda do volume é responsabilidade do operador.
- Sem fluxo de convite/segundo usuário, passkeys, OAuth ou RBAC.

## 10. Limitações para o próximo marco

M2-B/C e M3–M5 ainda precisam de: journal/jobs, worker, conector Linux, PTY, filesystem/Git reais,
preview, reconciliação após reboot, providers/modelos, MCP, anexos/transcrição, RBAC e integração
GitHub. Este lote não prova isolamento entre usuários, execução, cobrança, backup ou operação Linux.

## 11. Diagnóstico

**Lote M2-A tecnicamente pronto para aceite, com ressalvas não bloqueantes.**

Typecheck, lint, 40 testes web, 16 testes de servidor, build e 37 testes Playwright passaram; a
política de sessão foi exercitada com relógio controlado, a revogação é imediata, a UI preserva
rascunhos na expiração e o restart da API mantém a sessão. As ressalvas são ambientais
(Compose/Linux/Postgres restart não executados), de validação física/cross-browser e de escopo
(sem backup, convite, OAuth/passkeys).

O usuário registrou **aceite do M2-A em 11/11/2026**. O lote foi migrado para o servidor Linux
`jarvis` em modo nativo e está operacional na tailnet; HTTPS via Serve e Compose continuam
pendentes. O aceite não autoriza M2-B/C, M3, deploy público, push ou publicação; ressalvas de
validação física continuam válidas.
