# M1-X — chat sem card de título e status no fim da resposta

Registro local de 11/11/2026. Ajuste de densidade e de ações do chat sobre o M1-W, sem mudança de
escopo, dados fictícios ou execução real.

> **Anterior:** cabeçalho unificado e menu lateral em
> [`m1-w-header-rail.md`](m1-w-header-rail.md).
>
> **Continuação:** composer com voz, modelo, contexto e anexos em
> [`m1-y-composer-modes.md`](m1-y-composer-modes.md).

## 1. O que mudou

### Card de título do chat removido

- O bloco com título da sessão, estado, parada e abas saiu do topo do chat.
- O desktop ganhou a altura de volta; o título da sessão continua na sidebar.
- Em telas menores que 1280 px, resta apenas uma faixa fina de abas de sessão, sem fundo, borda ou
  título duplicado. Ela preserva a troca de sessão no mobile.
- Não há mais heading `Implementação` dentro da conversa.

### Estado de execução no fim dos bubbles

- Quando a sessão está executando, surge um chip **Executando…** depois de todas as mensagens.
- O chip fica no fluxo do conteúdo, abaixo dos bubbles, e acompanha a rolagem.
- Ao passar o mouse ou focar pelo teclado, o chip troca para **Interromper**, com ícone de parada.
- Clicar abre a confirmação já existente, com escopo explícito.
- A tecla `Esc` abre a mesma confirmação quando há execução e nenhum diálogo aberto.
- O estado não é exibido quando a sessão está ociosa, interrompida ou histórica.

### Terminal no cabeçalho

- O chip flutuante **Terminal** saiu de cima do composer.
- **Terminal 2** agora fica no cabeçalho, ao lado de **Previews** e **Revisão**.
- Abre o mesmo drawer demonstrativo, sem PTY real.
- Em telas estreitas, Terminal continua no menu **Mais**.

### Jobs → Background

- O chip flutuante **Jobs** passou a se chamar **Background**.
- Com trabalho rodando: **2 em background**, com ponto pulsante.
- Sem trabalho rodando: **Background · 2**, com o total.
- O painel correspondente agora se chama **Trabalho em background**.
- A navegação inferior mobile também usa **Background**.
- O termo evita duas confusões: **Processos** já é a lista de processos do SO e **Shell** não
  cobriria subagentes. Background cobre ferramentas e subagentes, que é o conteúdo real da lista.

### Rolagem e chips

- A sessão em execução abre no fim da conversa, para o status ficar visível.
- **Recentes** saiu do card e entrou na linha de chips flutuantes, com `pointer-events-auto`.
- O padding inferior voltou ao tamanho normal depois que o chip Terminal saiu da linha: a margem
  grande no fim do chat foi removida.

## 2. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. Confirme que o card com `Implementação` e `Ociosa` não existe mais.
2. Selecione o cenário **Durante execução**.
3. Confira o chip **Executando…** abaixo dos bubbles.
4. Passe o mouse ou foque o chip: ele vira **Interromper**.
5. Pressione `Esc`: a confirmação de interrupção deve abrir.
6. Cancele e confirme que a execução continua.
7. Abra **Terminal 2** no cabeçalho, ao lado de Revisão.
8. Confira **2 em background** no chip acima do composer.
9. Role para cima e use **Recentes** para voltar ao fim.
10. Em 390×844, confira a faixa fina de sessões, o chip de status e a navegação **Background**.

## 3. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1y-desktop-idle.png`
- `m1y-desktop-running-end.png`
- `m1y-desktop-running-hover.png`
- `m1y-desktop-stop-esc.png`
- `m1y-mobile-idle.png`
- `m1y-mobile-running-end.png`

![Chat ocioso sem card de título](evidencias/m1y-desktop-idle.png)

![Status no fim da resposta](evidencias/m1y-desktop-running-end.png)

![Hover troca o status por Interromper](evidencias/m1y-desktop-running-hover.png)

![Esc abre a confirmação](evidencias/m1y-desktop-stop-esc.png)

![Status visível no mobile](evidencias/m1y-mobile-running-end.png)

## 4. Arquivos alterados

- `src/features/chat/ChatPanel.tsx` — remove o card, adiciona status no fim, `Esc`, Background e
  Recentes na linha de chips.
- `src/features/workbench/WorkbenchPage.tsx` — Terminal no cabeçalho, título do drawer e navegação
  mobile.
- `src/features/jobs/JobsPanel.tsx` — título e texto de background.
- `src/features/ops/ProcessesPanel.tsx` — distinção entre background e processos do SO.
- `e2e/desktop.spec.ts` — status, hover, `Esc`, confirmação e ausência do heading.
- `e2e/scenarios.spec.ts` — Terminal pelo cabeçalho.
- `e2e/mobile.spec.ts` — navegação **Background**.
- Documentação: este arquivo.

## 5. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 28 testes (23 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

## 6. Limitações

- O status aparece só durante execução; não há chip para ociosa, interrompida ou histórica.
- `Esc` abre a confirmação; a interrupção só ocorre ao confirmar.
- **Background** lista trabalhos lógicos e subagentes, não processos do SO.
- O chip flutuante ainda pode cobrir conteúdo antigo enquanto o usuário rola para cima; o padding
  inferior cobre apenas o fim da conversa.
- A faixa de sessões no mobile continua sendo a única troca de sessão fora da sidebar.
- Telefone físico, teclado virtual e leitor de tela manual seguem não validados.
- Sem commits, push ou deploy.
