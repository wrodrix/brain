# M1-R — revisão visual da fatia de chat (T03)

Registro local de 11/11/2026. Esta rodada reformula **somente a fatia representativa do chat**,
preservando o simulador, os dados fictícios e o restante do M1. Não é o MVP e não inicia M2.

> **Continuação:** a sidebar e os recursos da área de trabalho foram reorganizados em
> [`m1-s-sidebar.md`](m1-s-sidebar.md).

## 1. O que mudou na experiência

### Conversa

- Mensagem da pessoa à direita, em bubble discreta (`Message` + `Bubble`), com fontes/anexos logo
  abaixo e metadados secundários no rodapé.
- Resposta do agente fluida à esquerda, sem card envolvendo a resposta inteira.
- Cabeçalho por mensagem removido: não há repetição de avatar, modo, modelo, effort e horário em cada
  fragmento. Modelo/effort aparecem uma vez, discretamente, no composer.
- Ações da resposta limitadas ao que existe de verdade: copiar resposta e abrir o diff. Não há botão
  de retry, feedback ou editor que finja operação de modelo.
- Código em `CodeBlock` com rótulo de linguagem e botão de copiar. Blocos quebram linha no mobile
  em vez de empurrar a página horizontalmente.

### Atividade do agente

- Ferramentas viraram linhas compactas dentro de `Trace`, com ícone, comando, estado e detalhes
  expansíveis sob demanda.
- Argumentos incompletos aparecem como “em geração”, com o JSON parcial e a explicação de que nada
  foi executado somente ao abrir os detalhes.
- Saída/argumentos usam `CodeBlock`; o job relacionado abre em diálogo próprio.
- Subagente é uma linha curta com estado; ao expandir, mostra objetivo, modelo, ferramentas do filho
  e resumo. O transcript completo só aparece em “Ver sessão filha”.
- Aprovação pendente é um `Item` inline, fora do `Trace`, com escopo, risco, argumentos e botões
  **Recusar**/**Permitir**. Ela não fica escondida em seção recolhida.
- Jobs não são mais despejados em uma grade no fim da conversa. Cada job permanece associado ao
  turno/mensagem que o originou.
- Fila de mensagens é uma faixa compacta acima do composer. A mensagem admitida também aparece no
  fluxo como mensagem da pessoa, com estado discreto.

### Composer

- Composição baseada em `InputGroup` (Prompt Input): anexos no topo, campo no meio e controles no
  rodapé.
- O editor continua sendo CodeMirror 6, preservando Markdown ao digitar, caret, seleção, undo,
  colagem, menções `@`/`#` e rascunhos por sessão.
- Anexos aparecem como `Attachment`; remover e inspecionar conteúdo continuam disponíveis.
- Modelo/effort são exibidos como configuração do cenário, com ícone de trava, sem dropdown falso.
- Envio permanece em **⌘/Ctrl+Enter** ou botão; Enter comum continua criando nova linha.
- Escolha de entrega (“próximo ponto seguro”/“depois do atual”) só aparece quando há texto e a
  sessão está executando, reduzindo ruído no estado vazio.

### Rolagem e foco

- `MessageScroller` oficial mantém a âncora da mensagem da pessoa e acompanha streaming apenas
  quando apropriado.
- Rolar para cima com intenção do usuário interrompe o autoscroll. “Recentes” no cabeçalho retorna
  ao fim.
- Resultado de busca continua abrindo o turno correto, com destaque.
- Rascunho e posição de rolagem sobrevivem à navegação interna entre chat, arquivos e jobs.

### Ruído removido

- Frases contratuais permanentes como “sem percentual inventado”, “não injeta transcript” e
  “nenhum modelo é chamado” saíram da conversa e foram para detalhes, tooltips ou texto secundário.
- O aviso global de demonstração permanece no banner.
- O toast redundante ao trocar de cenário foi removido; o próprio banner indica o cenário ativo.
- Timestamps e estados usam texto legível, não fontes minúsculas para caber mais informação.

## 2. Padrões oficiais reaproveitados

Os componentes do shadcn são copiados para o projeto. Nesta rodada foram adicionados/adaptados:

| Padrão | Arquivo local | Origem | Adaptação necessária |
| --- | --- | --- | --- |
| Message | `src/components/ui/message.tsx` | registry `new-york-v4/message` | imports locais (`cn`). |
| Bubble | `src/components/ui/bubble.tsx` | registry `new-york-v4/bubble` | `Slot` do Radix já usado no projeto; imports locais. |
| Message Scroller | `src/components/ui/message-scroller.tsx` | registry de Chat/Message Scroller | usa `@shadcn/react` 0.3.1; botão adaptado ao visual local. |
| Trace / Tool | `src/components/ui/trace.tsx` | registry `base-rhea/trace` | `Collapsible` existente baseado em Radix; ícones lucide; classes adaptadas ao tema. |
| Code Block | `src/components/ui/code-block.tsx` | registry `base-rhea/code-block` | sem `use-highlighted-code`; cópia via `navigator.clipboard`; classes locais. |
| Prompt Input | `src/components/ui/input-group.tsx` | registry `base-rhea/input-group` | o controle é CodeMirror, não textarea; foco e alturas adaptados. |
| Item / Confirmation | `src/components/ui/item.tsx` | registry `new-york-v4/item` | `Slot`/`Separator` locais; usado como confirmação inline. |
| Attachment | `src/components/ui/attachment.tsx` | registry `base-rhea/attachment` | versão sem Base UI, com os mesmos slots visuais. |
| Subagent | composição em `TurnView.tsx` | documentação Subagent | `TraceCollapsible` com `Trace` aninhado e resumo do filho. |
| Queue | composição em `QueueStrip.tsx` | documentação Queue | fila de mensagens (não todo list), usando `TraceCollapsible`. |

**Não foram instalados Next.js, AI SDK, `@ai-sdk/react`, backend ou integração de inferência.** O Chat
oficial usa `useChat`; aqui o simulador local existente continua alimentando os mesmos estados. A
única dependência nova é `@shadcn/react`, usada pelo primitivo oficial do Message Scroller.

## 3. Como avaliar

Servidor local: **http://127.0.0.1:5173**.

Abra:
`/projects/atlas/worktrees/wt-login?view=chat`

Cenários no banner:

1. **Conversa concluída** — prompt, fontes, ferramenta expansível, subagente compacto, resposta
   Markdown com lista e código copiável.
2. **Durante execução** — ferramenta/subagente executando, resposta em streaming, continuação já
   admitida na fila. Avance eventos para ver entrega/incorporação. Role para cima e use “Recentes”.
3. **Aprovação pendente** — item de confirmação inline com argumentos, risco, Recusar e Permitir.
   Permitir vira uma linha “executando”; Recusar vira “recusada”, sem aprovação posterior.

Interações para conferir:

- expandir a linha de testes e depois o subagente;
- copiar o bloco de código e a resposta;
- usar “Ver sessão filha” e fechar;
- enviar Markdown durante execução e alterar a preferência de entrega ao digitar;
- abrir uma issue, fechar e confirmar que o rascunho do composer permanece;
- conferir desktop e 390×844, incluindo overflow horizontal da página.

## 4. Capturas desta rodada

Arquivos novos em `docs/dev/evidencias/` (as capturas anteriores foram preservadas):

- `m1r-desktop-chat.png`
- `m1r-desktop-during-run.png`
- `m1r-desktop-approval.png`
- `m1r-desktop-approval-allowed.png`
- `m1r-mobile-chat.png`
- `m1r-mobile-during-run.png`
- `m1r-mobile-approval.png`


## 5. Arquivos alterados

Principais:

- `src/features/chat/ChatPanel.tsx` — composição do thread, Message Scroller, header e ações.
- `src/features/chat/TurnView.tsx` — turnos, mensagens, Trace/Tool, subagente e confirmação.
- `src/features/chat/PromptComposer.tsx` — Prompt Input com CodeMirror.
- `src/features/chat/QueueStrip.tsx` — fila compacta.
- `src/features/chat/SourceAttachment.tsx` — fontes/anexos.
- `src/features/chat/build-chat-turns.ts` — agrupamento por turno.
- `src/components/ui/message.tsx`, `bubble.tsx`, `trace.tsx`, `code-block.tsx`,
  `input-group.tsx`, `item.tsx`, `attachment.tsx`, `message-scroller.tsx` — padrões locais.
- `src/components/markdown/MarkdownView.tsx` — código com CodeBlock/copiar.
- `src/demo/fixtures.ts`, `simulator.ts`, `types.ts` — cenário de aprovação, turnos e fila inicial.
- `src/index.css`, `src/features/chat/ChatParts.tsx`, `src/features/chat/ComposerEditor.tsx`,
  `src/features/workbench/WorkbenchPage.tsx`.
- Testes: `src/features/chat/build-chat-turns.test.ts`, `src/demo/simulator.test.ts`,
  `src/components/markdown/MarkdownView.test.tsx`, `e2e/desktop.spec.ts`, `e2e/mobile.spec.ts`.

## 6. Validação executada

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | **39 testes** em 7 arquivos |
| `npm run build` | passou (aviso existente de chunk > 500 kB) |
| `npm run test:e2e` | **23 testes**: 18 desktop + 5 mobile |
| Lighthouse no chat desktop | acessibilidade **100**, boas práticas **100**, SEO **100** |
| Console/rede externa nos E2E | sem erros; nenhuma requisição externa |

Os testes preservam verificações de comportamento: fila com admissão/entrega/incorporação,
mensagem durante execução, argumentos incompletos, recusa sem aprovação posterior, rascunhos,
busca, foco do overlay, conflito de arquivo, gates/merge e ausência de métricas inventadas.

## 7. Lacunas

- Teclado virtual, caret e undo em **telefone real** continuam não validados; os testes móveis usam
  Chromium em 390×844.
- Leitor de tela manual (VoiceOver/NVDA) não foi executado; houve Lighthouse/axe, foco e teclado.
- Firefox e WebKit não foram executados.
- Code splitting do bundle segue pendente; o build mantém o aviso de tamanho.
- Estado continua em memória; recarregar reinicia o cenário.
- Nenhum commit, push, deploy ou integração externa foi realizado.
- Esta rodada para na fatia do chat/T03. As demais telas do M1 não foram reformuladas.
