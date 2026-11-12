# M1-U — setup no lugar, sidebar colapsável e busca de arquivos

Registro local de 11/11/2026. Ajustes de detalhe sobre o layout do M1-T, sem mudança de escopo.

> **Continuação:** plano em popover por provider e contexto no composer em
> [`m1-v-plan-context.md`](m1-v-plan-context.md).

## 1. O que mudou

### `Setup: ok` saiu do cabeçalho

- Setup é uma etapa de preparação do worktree, não uma ação recorrente depois que ele está pronto.
- O botão `Setup: ok` foi removido do cabeçalho.
- Setup com falha continua visível na conversa, com logs/exit code e repetição explicitamente
  indisponível no M1.
- Logs de setup continuam acessíveis na página do projeto e no aviso de falha do chat.

### Colapsar/expandir sidebar

- O controle de recolher agora fica **dentro da sidebar**, no topo da seção Sessões.
- Quando a sidebar está recolhida, o botão de expandir aparece no cabeçalho **depois de Revisão**.
- O chat ocupa a largura liberada; ao expandir, sessões e árvore voltam ao estado anterior.
- O controle não fica mais solto ao lado de Setup no cabeçalho.

### Busca de arquivos

- Input `Buscar arquivo` diretamente na sidebar, acima da árvore.
- Busca por nome ou path, sem diferenciar maiúsculas/minúsculas.
- A árvore mantém os diretórios pais dos resultados, em vez de achatar os paths.
- Botão de limpar aparece quando há consulta.
- A mesma busca foi adicionada à página de Arquivos no mobile.
- Estado vazio explícito: “Nenhum arquivo encontrado.”
- Clicar em um resultado continua abrindo o arquivo no painel lateral redimensionável.

## 2. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. Confirme que não existe mais `Setup: ok` no cabeçalho.
2. Use o ícone no topo de Sessões para recolher a sidebar.
3. Confirme que o ícone de expandir aparece depois de **Revisão**.
4. Expanda novamente.
5. Digite `Login` em `Buscar arquivo`: devem aparecer `LoginController.php` e
   `LoginRedirectTest.php`, mantendo `app/` e `tests/`.
6. Limpe a busca e abra um arquivo pelo painel lateral.
7. Em 390×844, abra **Arquivos** pela navegação inferior e use a mesma busca.

## 3. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1u-desktop-chat.png`
- `m1u-desktop-file-search.png`
- `m1u-desktop-sidebar-collapsed.png`
- `m1u-mobile-files.png`


## 4. Arquivos alterados

- `src/features/workbench/WorkbenchPage.tsx` — remove Setup do header, move o recolhimento para a
  sidebar, adiciona expansão após Revisão e busca de arquivos.
- `src/features/files/FilesPanel.tsx` — busca na árvore da página mobile.
- `src/features/files/FileTree.tsx` + `src/features/files/file-tree-filter.ts` — filtro preservando
  hierarquia.
- `e2e/desktop.spec.ts` — valida busca de arquivo.
- Documentação: este arquivo.

## 5. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 24 testes (19 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

## 6. Limitações

- O estado da sidebar e o texto da busca são de sessão; recarregar reinicia.
- A busca é local nas fixtures, não no filesystem do host.
- Telefone físico, teclado virtual e leitor de tela manual seguem não validados.
- Sem commits, push ou deploy.
