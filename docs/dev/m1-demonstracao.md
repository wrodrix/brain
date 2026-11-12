# M1 — demonstração navegável da interface

Registro de desenvolvimento de 11/11/2026. Documentação pública de desenvolvimento do recorte
aprovado em D-066; não substitui o planejamento privado em `docs/plano/`.

> **Revisões seguintes:** a fatia de chat/T03 foi reformulada em
> [`m1-r-chat.md`](m1-r-chat.md), a sidebar/recursos em
> [`m1-s-sidebar.md`](m1-s-sidebar.md) e os ajustes de layout em
> [`m1-t-layout.md`](m1-t-layout.md), os detalhes de sidebar/busca em
> [`m1-u-sidebar-search.md`](m1-u-sidebar-search.md), o plano/contexto em
> [`m1-v-plan-context.md`](m1-v-plan-context.md), o cabeçalho/menu lateral em
> [`m1-w-header-rail.md`](m1-w-header-rail.md), o chat/atividade em
> [`m1-x-chat-activity.md`](m1-x-chat-activity.md) e o composer em
> [`m1-y-composer-modes.md`](m1-y-composer-modes.md). As capturas mais antigas desta página
> permanecem como evidência da entrega original; as novas usam os prefixos `m1r-`, `m1s-`, `m1t-`,
> `m1u-`, `m1v-`, `m1w-`, `m1y-`, `m1z-`, `m1aa-` e `m1ab-`.
>
> **Fechamento consolidado:** estado final, correções, validação e pendências em
> [`m1-fechamento.md`](m1-fechamento.md). Este documento permanece como registro da entrega
> original e das revisões que a sucederam.

**Codinome interno:** Brain (nome definitivo adiado).  
**Escopo:** M1.0–M1.5. Não é o MVP completo e não contém execução real.

> **Demonstração — dados fictícios, sem execução real.**

## 1. O que está implementado

### M1.0 — Base, fixtures e simulador

- Aplicação React + Vite + TypeScript com Tailwind CSS v4 e componentes no estilo shadcn/ui.
- Banner persistente com aviso de demonstração e controles de cenário: reproduzir, avançar,
  pausar e reiniciar.
- Cinco cenários determinísticos: trabalho normal, setup falho, mensagem durante execução,
  revisão desatualizada e rede instável.
- Fixtures tipadas com dois projetos, quatro worktrees (um com checkout removido), sessões
  pai/filho, issues, arquivos, diffs, jobs, PR, gates, processos, terminais, preview e cotas.
- Reducer com reset determinístico, fila, conflitos de versão, publicação incerta, merge e
  remoção simulados. Timers são limpos ao pausar, trocar de cenário ou desmontar.
- Testes unitários de simulador, fila, gates, arquivos, busca, menções e renderização segura.

### M1.1 — Projetos, worktrees, sessões e área de trabalho

- T01: lista de projetos, worktrees ativos, integrados e checkouts removidos.
- T03: worktree com ambiente, branch, conexão, issue, setup e sessões identificados.
- Desktop com rail de sessões/recursos e painel de código recolhível.
- Mobile com uma área principal por vez e navegação própria: Chat, Arquivos, Jobs e Mais.
- Rascunhos por sessão, seleção de arquivo por worktree e memória de scroll do chat preservados
  durante a navegação.

### M1.2 — Chat, composer, fila e jobs

- Composer CodeMirror 6 com decoração de Markdown durante a digitação: títulos, listas,
  citações, código inline, bloco com/sem linguagem e delimitadores ainda abertos.
- Formatação sem reescrever o documento: caret, seleção, undo/redo e colagem permanecem nativos.
- Menções `@` para arquivos/pessoas e `#` para issues, com seleção explícita, chips inspecionáveis
  e erro de fonte indisponível. E-mail, código inline e bloco de código não abrem o seletor.
- Envio durante execução cria item de fila com snapshot do texto e das fontes. Estados distintos:
  admitida, entregue, incorporada ou adiada. Interromper o agente é ação separada.
- Ferramentas exibem argumentos em geração como **não executados**; aprovação/recusa e escopo
  ficam visíveis.
- Jobs e subagentes têm detalhe próprio. Abrir a sessão filha não injeta o transcript no pai.

### M1.3 — Issues, arquivos e histórico

- Overlay global de issues a partir de qualquer tela, com lista/detalhe, busca local, edição de
  título/descrição, comentários e publicação fictícia.
- Rascunho de comentário preservado ao fechar/reabrir; foco retorna ao disparador; Esc fecha.
- Mobile distingue **Voltar** (lista interna) de **Fechar** (overlay).
- Resultado de publicação incerto preserva o rascunho e evita retry cego/duplicado.
- Árvore de arquivos, editor CodeMirror 6, diff unificado e edição em memória.
- Conflito de versão bloqueia o salvamento, preserva o buffer humano e oferece comparação/recarga.
- Binário, arquivo grande e conteúdo indisponível têm tratamento explícito.
- Busca no histórico com termos, frase exata e literal/código; filtros por escopo e subagentes;
  abre o trecho exato, mantém a consulta e inclui no prompt somente por ação separada.
- Sessão com checkout removido abre histórico sem recriar worktree.

### M1.4 — Revisão, integração e painéis operacionais

- T09: PR, head/base, SHA atual e revisado, gates com estados distintos, evidência desatualizada,
  métodos permitidos e merge solicitado/em fila/confirmado.
- Merge não remove o worktree. Remoção é manual, exige confirmação própria e preserva sessões,
  evidências e anexos.
- T08: conexão fictícia, contexto, uso reportado e quota em painéis distintos; ausência permanece
  “não disponível”, sem zero inventado.
- T10: terminal com saída reproduzida, sem shell conectada e entrada desativada; preview com URL
  fictícia, acesso e indisponibilidade, sem abrir links.
- T13: processos com origem, escopo, atribuição, CPU/memória, alerta de resíduo, serviço
  persistente legítimo e encerramento simulado com confirmação.
- T11: projeto, modos, MCP, contexto, política, acesso/dispositivos e limites de segurança em
  modo ilustrativo. Campos de credencial real ficam desativados.

### M1.5 — Consolidação, acessibilidade e demonstração guiada

- Roteiro guiado com oito etapas e diálogo “Sobre esta demonstração”.
- Foco visível, skip link, rótulos explícitos, foco devolvido pelo overlay, navegação por teclado e
  estados que não dependem apenas de cor.
- Lighthouse 100 em acessibilidade, boas práticas e SEO na jornada de chat.
- Testes ponta a ponta em desktop e viewport móvel, com bloqueio de requisições externas e falha em
  erros de console.

## 2. Como executar

Requisitos: Node.js suportado e npm.

```bash
npm install
npm run dev
```

Acesse **http://127.0.0.1:5173**.

Scripts:

```bash
npm run typecheck     # TypeScript
npm run lint          # ESLint
npm test              # Vitest (unitários/componentes)
npm run build         # typecheck + build de produção
npm run preview       # servir o build em 127.0.0.1:4173
npm run test:e2e      # Playwright (desktop + mobile emulado)
```

O primeiro uso do Playwright pode exigir `npx playwright install chromium`.

## 3. Testes executados

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 40 testes em 7 arquivos passaram |
| `npm run build` | passou (Vite 7.3.8) |
| `npm run test:e2e` | 30 testes passaram (25 desktop + 5 mobile) |
| Lighthouse (chat desktop) | acessibilidade 100, boas práticas 100, SEO 100 |

Versões principais observadas: Node 25.2.1, npm 11.6.2, React 19.3.1, Vite 7.3.8,
Tailwind CSS 4.3.5, CodeMirror View 6.43.15, Vitest 4.1.12, Playwright 1.65.0.

Os testes ponta a ponta cobrem: navegação e banner; composer com Markdown, caret, undo e colagem;
fila durante execução; menções e fontes; overlay de issue e foco; conflito de arquivo; binário e
arquivo grande; busca e inclusão explícita no prompt; detalhe de subagente sem alterar o pai;
gates/merge/remoção; painéis operacionais; credenciais desativadas; cenários de falha e rede
instável; reset; roteiro guiado; navegação móvel, overlay móvel, diff unificado e busca móvel.

As capturas da implementação local, não imagens geradas, ficam em `docs/dev/evidencias/` e **não
são versionadas**; um clone do repositório não as contém. As evidências finais estão descritas em
[`m1-fechamento.md`](m1-fechamento.md) com o prefixo `m1close-`.


## 4. O que continua simulado

| Área | Natureza no M1 |
| --- | --- |
| Agente, streaming, raciocínio e subagentes | Eventos e textos de fixtures; nenhum modelo é chamado. |
| Projetos, worktrees, setup e arquivos | Identidades e conteúdo fictícios; nada é lido/escrito no filesystem do host. |
| Git, PR, gates, merge e remoção | Estados de cenário; nenhum comando Git ou chamada GitHub. |
| Terminal, preview e processos | Saída reproduzida e métricas fictícias; sem PTY, porta, túnel ou processo real. |
| Issues e comentários | Edição/publicação apenas em memória; sem escrita externa. |
| Auth, conexões, chaves, MCP e dispositivos | Representação visual; nenhuma credencial é solicitada ou armazenada. |
| Cotas, consumo e custo | Valores de exemplo ou indisponíveis; sem consulta a provedores. |
| Áudio/anexos | Microfone, transcrição, níveis e upload simulados localmente; nenhum áudio é capturado nem arquivo sai do navegador. |

## 5. Limitações, lacunas e próximos passos

- **Estado em memória:** recarregar ou fechar a aba reinicia o cenário. Isso é intencional no M1;
  persistência durável, journal e reconciliação são requisitos de M2.
- **Sem backend:** Better Auth, Fastify, PostgreSQL, pg-boss, AI SDK, conector e PTY reais não
  foram instalados. Nenhuma simulação comprova segurança, isolamento ou operação Linux.
- **Telefone real não validado:** os testes móveis usam Chromium com viewport de 390×844. Teclado
  virtual, caret/seleção/undo do iOS/Android, orientação e retorno de suspensão em aparelho físico
  **não** foram verificados.
- **Leitor de tela:** a estrutura foi auditada por Lighthouse/axe e testes de foco/teclado, mas não
  houve revisão manual com VoiceOver/NVDA.
- **Navegadores:** os testes ponta a ponta usam Chromium. Firefox e WebKit não foram executados.
- **Bundle:** o build único tem aviso de tamanho (>500 kB) por CodeMirror e Markdown; code splitting
  pode ser tratado em consolidação futura.
- **Persistência de rascunho:** sobrevive à navegação interna, não ao reload. O aviso está na
  interface.
- **Sem commits:** o trabalho permanece não commitado; publicação e push não foram realizados.
- **Próximos marcos:** M2 (auth/bootstrap, banco, serviços, conector), M3 (worktree/Git/editor/PTY
  reais), M4 (núcleo Go) e M5 (jornada GitHub completa). Nada disso foi iniciado.

## 6. Matriz de aceitação do M1

| Critério | Situação no recorte | Evidência principal |
| --- | --- | --- |
| C-01 | Atendido: T01–T13 acessíveis; overlay/painel não troca o worktree. | Navegação, rotas e testes de cenário. |
| C-02 | Atendido: rascunho, seleção de arquivo e scroll do chat preservados. | Teste de job/sessão filha e rascunhos do composer. |
| C-03 | Atendido: overlay abre de qualquer tela, preserva rascunho, devolve foco; mobile tem Voltar/Fechar. | Testes desktop/mobile do overlay; Escape. |
| C-04 | Atendido: Markdown ao digitar, delimitadores abertos, caret, undo, colagem e envio. | Teste do composer e unitários de decoração. |
| C-05 | Atendido: menção é seleção explícita; e-mail/código não disparam; fonte inspecionável/erro. | Teste de menções e `mention.test.ts`. |
| C-06 | Atendido: envio durante execução não interrompe; fila distingue estados; snapshot local. | Teste de fila e reducer. |
| C-07 | Atendido: escopos distintos e detalhe do filho não altera o pai. | Teste de job/subagente. |
| C-08 | Atendido: versão/conflito sem sobrescrita; binário/grande/indisponível explícitos. | Teste de arquivos e reducer. |
| C-09 | Atendido: busca por termo/frase/literal, trecho exato, consulta preservada, inclusão separada. | Testes desktop/mobile e unitários. |
| C-10 | Atendido: gates do SHA, métodos permitidos, desatualizado/indisponível/falha, remoção confirmada. | Teste de revisão/merge/remoção e cenário de revisão desatualizada. |
| C-11 | Atendido no viewport emulado: sem três colunas, diff unificado, ações essenciais visíveis. | Testes mobile; telefone físico não validado. |
| C-12 | Atendido no recorte automatizado: foco visível/restaurado, rótulos, teclado, contraste, diálogos. | Lighthouse 100; testes de foco/Escape; revisão manual de leitor de tela pendente. |
| C-13 | Atendido: Markdown sem HTML/JS, imagem externa bloqueada; nenhuma requisição externa nos E2E. | `MarkdownView.test.tsx` e monitor dos testes. |
| C-14 | Atendido: sem endpoint externo, credencial, áudio, comando ou processo real. | Monitor de rede, campos desativados e limites na UI. |
| C-15 | Atendido: reset determinístico, timers com cleanup, console sem erros nos testes. | Unitários de reset e E2E com monitor de console. |

Os critérios validam a apresentação e as transições locais do M1. **Não substituem** os cenários de
aceitação do MVP que dependem de efeitos reais, persistência, segurança entre usuários, reboot,
gates remotos e terminal real.

## 7. Organização do código

```text
src/
  demo/          tipos, fixtures, simulador, provider e seletores
  features/      projetos, chat, issues, arquivos, busca, revisão, operações, configurações
  components/    UI base (shadcn/ui), status e Markdown seguro
  test/          setup do Vitest
e2e/             jornadas Playwright desktop/mobile
docs/dev/        esta documentação e capturas da implementação
```

Fixtures e adapter de demonstração ficam separados dos componentes. A interface não importa
serviços reais de backend, provedores ou Git.
