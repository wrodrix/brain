# M1-W — cabeçalho unificado e menu lateral no estilo VSCode

Registro local de 11/11/2026. Ajuste de navegação sobre o workbench do M1-V, sem mudança de escopo,
dados fictícios ou execução real.

> **Anterior:** plano em popover e contexto no composer em
> [`m1-v-plan-context.md`](m1-v-plan-context.md).
>
> **Continuação:** chat sem card de título, status no fim da resposta e Terminal no cabeçalho em
> [`m1-x-chat-activity.md`](m1-x-chat-activity.md).

## 1. O que mudou

### Cabeçalho global incorporado ao workbench

- No workbench, o cabeçalho global do app não é mais renderizado separado. Ele foi incorporado à
  barra de breadcrumbs do worktree.
- A barra agora reúne:
  - logo do Brain, levando de volta aos projetos;
  - breadcrumb `Projetos / Atlas / issue-142-login`;
  - nome do worktree, branch, estado do ambiente e issue `#142`;
  - busca de sessões (`⌘K`);
  - Issues;
  - menu da conta;
  - Previews e Revisão;
  - expandir sidebar e menu **Mais** em telas estreitas.
- O cabeçalho do workbench caiu de 57 px para **49 px**.
- Ambiente e conexão continuam no rodapé desktop; o cabeçalho ficou reservado para navegação e
  contexto do worktree.

### Menu de ícones antes da sidebar

- Os itens do antigo menu superior agora ficam numa **barra de atividades vertical de 44 px**, antes
  da sidebar de sessões e arquivos.
- Só ícones, com tooltip e `aria-label`:
  - Projetos;
  - Buscar sessões;
  - Issues;
  - Cotas;
  - Configurações.
- O item ativo tem fundo e marcador vertical à esquerda, como no VSCode.
- A barra permanece visível quando a sidebar é recolhida; é ela que ancora a navegação global do
  workbench.
- Buscar abre o mesmo `SearchDialog` do atalho `⌘K`, sem duplicar diálogo ou estado.
- Issues abre o overlay global com retorno de foco para o botão que o acionou.

### Páginas fora do workbench

- Projetos, projeto, cotas e configurações mantêm o cabeçalho global tradicional.
- A barra de atividades é específica do workbench, onde existe a sidebar de arquivos.

### Mobile

- O workbench continua com um único cabeçalho, agora mais compacto: voltar, logo, worktree, issue,
  busca, issues, conta, Revisão e Mais.
- A barra de atividades não aparece abaixo de 1280 px.
- A navegação inferior (`Chat`, `Arquivos`, `Jobs`, `Mais`) permanece igual.

## 2. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. Confirme que existe apenas um cabeçalho no workbench.
2. Use o breadcrumb para voltar a **Projetos** ou **Atlas**.
3. Clique no ícone de busca no cabeçalho ou na barra lateral.
4. Clique em **Issues** na barra lateral e feche; o foco volta ao ícone.
5. Recolha a sidebar e confirme que a barra de ícones continua visível.
6. Expanda novamente pelo controle depois de **Revisão**.
7. Confira os tooltips de cada ícone da barra lateral.
8. Em 390×844, confirme que não há barra lateral de ícones e que o cabeçalho único continua
   utilizável.

## 3. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1w-desktop-header-rail.png`
- `m1w-desktop-rail-collapsed.png`
- `m1w-desktop-search.png`
- `m1w-mobile-header.png`


## 4. Arquivos alterados

- `src/features/workbench/WorkbenchPage.tsx` — cabeçalho único, barra de atividades e atalhos.
- `src/features/workbench/WorkbenchActivityBar.tsx` — barra vertical só com ícones e tooltips.
- `src/features/shell/AppShell.tsx` — esconde o cabeçalho global no workbench e compartilha ações.
- `src/features/shell/AccountMenu.tsx` — menu da conta extraído para reutilização.
- `src/features/shell/shell-actions.ts` — contexto de busca, roteiro e sobre.
- `e2e/desktop.spec.ts` — valida cabeçalho unificado, barra lateral e busca.
- Documentação: este arquivo.

## 5. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 27 testes (22 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

## 6. Limitações

- A barra de atividades existe só no workbench e só a partir de 1280 px.
- Não há reordenação, ocultação ou personalização dos ícones.
- Roteiro guiado e Sobre continuam no menu da conta, não na barra.
- A barra não substitui a navegação inferior mobile.
- Telefone físico, teclado virtual e leitor de tela manual seguem não validados.
- Sem commits, push ou deploy.
