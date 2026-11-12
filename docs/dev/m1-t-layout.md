# M1-T — split redimensionável, sidebar colapsável e consumo visível

Registro local de 11/11/2026. Ajustes de composição sobre a sidebar reorganizada no M1-S. O
simulador, os dados fictícios e o escopo do M1 continuam iguais.

> **Continuação:** remoção do botão de setup, recolhimento dentro da sidebar e busca de arquivos em
> [`m1-u-sidebar-search.md`](m1-u-sidebar-search.md); plano em popover e contexto no composer em
> [`m1-v-plan-context.md`](m1-v-plan-context.md).

## 1. O que mudou

### Split redimensionável

- O conteúdo das mensagens fica 8 px dentro da borda do composer (`px-5 sm:px-7` contra
  `px-3 sm:px-5`), como uma margem `mx` curta, mantendo o alinhamento visual sem grudar no campo.
- Chat e visualizador de arquivo agora usam `Resizable` do shadcn
  (`ResizablePanelGroup`, `ResizablePanel` e `ResizableHandle`), apoiado em
  `react-resizable-panels` 4.
- O divisor tem alça visível e é acessível por teclado (separador nativo).
- O painel de arquivo abre ao clicar na árvore e pode ser fechado; o chat permanece à esquerda.
- O layout é responsivo: abaixo de 1280 px a árvore/editor continuam na página de Arquivos, sem
  comprimir três colunas.

### Sidebar colapsável

- Botão de recolher/expandir no cabeçalho do worktree (ícone de painel).
- Ao recolher, a árvore sai de cena e o chat usa a largura disponível.
- Sessões e árvore continuam separadas e preservadas quando a sidebar volta.
- O estado é local da sessão da UI; recarregar reinicia.

### Jobs e Terminal flutuantes

- A linha que envolve os chips perdeu fundo e divisória.
- **Jobs** e **Terminal** ficam como chips flutuantes acima do composer, alinhados à borda
  esquerda do campo de composição (incluindo o mesmo recuo responsivo do composer).
- Cada chip abre o drawer correspondente sem trocar a rota nem perder o rascunho.
- Em mobile, o chip de plano também aparece nessa linha.

### Previews

- Saiu do rodapé e foi para o cabeçalho, ao lado de **Revisão**.
- Continua acessível pelo menu **Mais** em telas estreitas.

### Consumo explícito

- O rodapé desktop mostra **Plano + barra + 62%** antes de abrir qualquer painel.
- Em mobile, um chip **Plano + barra + 62%** fica junto de Jobs/Terminal.
- O drawer de Consumo abre com **Uso do plano** em primeiro lugar: janela, percentual, barra,
  restante, reset, leitura e fonte.
- A janela de 5 horas usa **62% de exemplo fictício**, explicitamente rotulado como cenário sem
  consulta ao provedor. Semanal e mensal continuam indisponíveis, sem virar zero.
- Clicar no medidor abre o detalhamento; a informação principal não exige clique.

### Processos enxuto

- Cada processo agora é uma linha compacta com:
  - nome/origem e estado;
  - CPU;
  - memória;
  - tempo em execução;
  - botão **Encerrar**.
- Comando, escopo, filhos, atribuição e logs ficam em **Detalhes**, recolhidos.
- O diálogo de confirmação continua com escopo e filhos afetados.
- O botão de encerramento é desabilitado quando a atribuição é apenas melhor esforço ou o ambiente
  está offline.

## 2. Dependência nova

- `react-resizable-panels@^4`, requisito do componente `resizable` do shadcn.
- Nenhum backend, PTY, serviço de inferência ou integração externa foi adicionado.

## 3. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. Clique num arquivo da árvore e arraste a alça entre chat e editor.
2. Feche o editor pelo `X` e confirme que o chat/rascunho permanecem.
3. Use o botão de painel no cabeçalho para recolher e expandir a sidebar.
4. Confira **Jobs · 2** e **Terminal · 2** flutuando acima do composer, sem barra de fundo.
5. Abra **Previews** ao lado de **Revisão**.
6. Confira no rodapé **Plano 62%** com barra; clique para abrir o detalhamento.
7. Abra **Processos** e confira as linhas compactas; expanda **Detalhes** de uma delas.
8. Repita em 390×844: o plano aparece no chip acima do composer e Processos no menu Mais.

## 4. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1t-desktop-chat.png`
- `m1t-desktop-file-panel.png`
- `m1t-desktop-sidebar-collapsed.png`
- `m1t-desktop-consumption.png`
- `m1t-desktop-processes.png`
- `m1t-mobile-chat.png`
- `m1t-mobile-consumption.png`
- `m1t-mobile-processes.png`

![Split com arquivo ao lado](evidencias/m1t-desktop-file-panel.png)

![Sidebar recolhida](evidencias/m1t-desktop-sidebar-collapsed.png)

![Consumo do plano](evidencias/m1t-desktop-consumption.png)

![Processos compactos](evidencias/m1t-desktop-processes.png)

![Mobile com plano visível](evidencias/m1t-mobile-chat.png)

## 5. Arquivos alterados

- `src/components/ui/resizable.tsx` — novo componente oficial adaptado.
- `src/features/workbench/WorkbenchPage.tsx` — split, sidebar colapsável, Previews no cabeçalho,
  rodapé com plano, drawers.
- `src/features/chat/ChatPanel.tsx` — chips sem fundo/divisória e plano no mobile.
- `src/features/ops/ConsumptionPanel.tsx` — uso do plano em destaque.
- `src/features/ops/ProcessesPanel.tsx` — linhas compactas.
- `src/demo/fixtures.ts` — janela de 5 h com 62% fictícios explícitos.
- `src/features/demo/DemoBanner.tsx` — contraste do texto secundário.
- `package.json`/`package-lock.json` — `react-resizable-panels`.
- Testes: `e2e/desktop.spec.ts` (split/sidebar/consumo/processos), `e2e/mobile.spec.ts`.

## 6. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 24 testes (19 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

O E2E agora também valida recolher/expandir a sidebar e arrastar o divisor do editor.

## 7. Limitações

- O breakpoint de desktop largo continua em 1280 px; abaixo disso usa-se a navegação inferior.
- A largura do split e o estado da sidebar são de sessão; recarregar reinicia.
- O uso de 62% é fictício e rotulado; não há consulta real de quota.
- Terminal sem PTY e processos sem inspeção real do host continuam limites do M1.
- Telefone físico, teclado virtual e leitor de tela manual não foram validados.
- Sem commits, push ou deploy.
