# M1-S — sidebar enxuta, árvore de arquivos e recursos

Registro local de 11/11/2026. Esta rodada reduz e reorganiza a área de trabalho da T03 sem ampliar
o escopo para outras telas. O chat permanece como área principal e o simulador local não foi
alterado em sua semântica.

> **Continuação:** split redimensionável, sidebar colapsável e consumo visível em
> [`m1-t-layout.md`](m1-t-layout.md).

## 1. O que mudou

### Sidebar

- A seção **Sessões** foi preservada como estava.
- A seção **Recursos** deixou de existir como lista de navegação.
- **Chat** saiu da sidebar: é a área padrão.
- **Revisão** saiu da sidebar: continua no cabeçalho do worktree.
- A **árvore de arquivos** agora fica diretamente na sidebar.
- **Alterações** foi incorporada à árvore: arquivos modificados/novos aparecem com `M`/`A`,
  binários/indisponíveis com aviso, sem uma segunda lista duplicando os mesmos paths.
- A sidebar foi mantida estreita (240 px) e agora contém apenas sessões + arquivos + uma nota curta
  sobre as marcações.

### Arquivos

- Clicar em um arquivo abre o editor/diff ao lado do chat, sem trocar a área principal.
- O painel lateral tem `Visualizar`, `Diff`, `Editar`, `Mencionar no chat` e fechamento próprio.
- Em telas menores que 1280 px, a árvore/editor usa a página de Arquivos acessada pela navegação
  inferior; o layout de três colunas fica reservado ao desktop largo.
- O modo página continua existindo para mobile e links diretos `?view=files`.

### Jobs, terminal e recursos

- **Jobs** e **Terminal** viraram botões compactos imediatamente acima do composer.
- Ambos abrem um drawer lateral, preservando chat, rascunho e rolagem.
- **Processos**, **Previews** e **Consumo** ficaram no rodapé de status do desktop, junto de
  ambiente e última atividade.
- No mobile/tablet estreito, esses mesmos recursos continuam no menu **Mais** e nos drawers.
- Rotas operacionais antigas (`?view=terminal`, `?view=processes`, `?view=usage` etc.) permanecem
  como fallback para links diretos, mas não aparecem mais na navegação normal da sidebar.

### Semântica de Terminal × Jobs

- **Terminal** representa o shell/PTY humano do worktree. No M1 ele é apenas uma **saída
  reproduzida**, sem shell conectada; por isso o drawer informa “Sem shell conectada” e não aceita
  comandos.
- **Jobs** representa trabalho lógico em background (ferramenta, teste ou subagente). Um job pode
  terminar e deixar processos; jobs e processos do SO não são a mesma lista.
- Os dois botões são separados justamente porque têm escopos e ações diferentes.

### Rodapé de status

Barra discreta no desktop com:

- ambiente e estado de conexão;
- última atividade do worktree;
- **Processos** com alerta quando há resíduo suspeito;
- **Previews**;
- **Consumo**.

## 2. Reaproveitamento e adaptações

Não houve nova dependência nesta rodada.

- A árvore foi extraída de `FilesPanel` para `src/features/files/FileTree.tsx`, reutilizada na
  sidebar e na página de arquivos.
- `FilesPanel` ganhou o modo `panel`, sem árvore própria, para ser renderizado ao lado do chat.
- O drawer reutiliza os painéis já existentes de Jobs, Terminal, Preview, Processos e Consumo.
- Os componentes oficiais do shadcn introduzidos no M1-R (`Message`, `Bubble`, `Trace`,
  `CodeBlock`, `InputGroup`, `Item`, `Attachment`, `MessageScroller`) continuam sendo a base do chat.
- Nenhum editor, backend, PTY ou serviço externo foi adicionado.

## 3. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

Desktop (≥1280 px):

1. Confira **Sessões** e **Arquivos** na sidebar; não há mais “Recursos” nem “Alterações”.
2. Clique em `LoginController.php` na árvore: o editor abre ao lado do chat.
3. Use `Visualizar`, `Diff` e `Editar`; feche pelo `X` e confirme que o chat/rascunho permaneceu.
4. Clique em **Jobs · 2** ou **Terminal · 2** acima do composer: o drawer abre e fecha.
5. Clique em **Processos**, **Previews** ou **Consumo** no rodapé; o conteúdo abre em drawer.
6. Role o chat para cima, avance um evento e use **Recentes** para voltar ao fim.
7. Abra `Revisão`, confirme que continua no cabeçalho e use **Conversa** para voltar.

Mobile/tablet (<1280 px):

1. A sidebar dá lugar à navegação inferior; **Arquivos** abre a árvore/editor em página dedicada.
2. **Jobs** na navegação inferior e os chips acima do composer abrem o mesmo drawer.
3. **Mais** reúne Terminal, Preview, Processos, Consumo, Revisão e Configurações.

## 4. Capturas desta rodada

Novas, sem sobrescrever as anteriores:

- `m1s-desktop-chat.png`
- `m1s-desktop-file-panel.png`
- `m1s-desktop-jobs-drawer.png`
- `m1s-desktop-terminal-drawer.png`
- `m1s-desktop-during-run.png`
- `m1s-desktop-approval.png`
- `m1s-mobile-chat.png`
- `m1s-mobile-files.png`
- `m1s-mobile-jobs-drawer.png`
- `m1s-mobile-terminal-drawer.png`

![Chat com sidebar enxuta](evidencias/m1s-desktop-chat.png)

![Arquivo aberto ao lado do chat](evidencias/m1s-desktop-file-panel.png)

![Drawer de jobs](evidencias/m1s-desktop-jobs-drawer.png)

![Drawer de terminal](evidencias/m1s-desktop-terminal-drawer.png)

![Chat mobile](evidencias/m1s-mobile-chat.png)

![Arquivos mobile](evidencias/m1s-mobile-files.png)

## 5. Arquivos alterados

- `src/features/workbench/WorkbenchPage.tsx` — sidebar, file panel, dock, footer, drawers, breakpoints.
- `src/features/files/FileTree.tsx` — novo componente de árvore com status.
- `src/features/files/FilesPanel.tsx` — modo painel sem árvore; editor/diff reutilizável.
- `src/features/chat/ChatPanel.tsx` — dock de Jobs/Terminal acima do composer.
- `src/features/review/ReviewPanel.tsx` — retorno explícito à conversa.
- `src/features/search/SearchDialog.tsx` — resultado de job abre o drawer do chat.
- Testes: `e2e/desktop.spec.ts`, `e2e/mobile.spec.ts`, `e2e/scenarios.spec.ts`.
- `src/index.css` — ajustes de altura do composer e tipos herdados da rodada anterior.
- Documentação: este arquivo.

## 6. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 23 testes (18 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

Os testes cobrem o novo fluxo de Jobs em drawer, Terminal em drawer, árvore na sidebar, editor
lateral, foco/retorno, arquivos no mobile, fila, revisão, aprovação e ausência de chamadas externas.

## 7. Limitações

- O breakpoint de desktop largo é 1280 px; abaixo disso a experiência usa navegação inferior e a
  página de arquivos, por decisão de layout.
- Terminal continua sem PTY real; é saída reproduzida do cenário.
- Telefone físico, teclado virtual e leitor de tela manual não foram validados nesta rodada.
- Firefox/WebKit não foram executados.
- Estado em memória; recarregar reinicia o cenário.
- Sem commits, push, deploy ou integração externa.
