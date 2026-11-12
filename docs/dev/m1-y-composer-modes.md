# M1-Y — composer com voz, modelo, contexto e anexos

Registro local de 11/11/2026. Evolução do composer e ajustes de navegação sobre o M1-X, sem mudança
de escopo, dados fictícios ou execução externa.

> **Anterior:** chat sem card de título e status no fim da resposta em
> [`m1-x-chat-activity.md`](m1-x-chat-activity.md).

## 1. Navegação

### Recolher sidebar na barra de atividades

- O controle de recolher/expandir saiu da sidebar e do cabeçalho.
- Agora fica no topo da barra de atividades, **acima de Projetos**.
- O ícone troca entre recolher e expandir, com tooltip e `aria-label`.
- A barra permanece visível quando a sidebar está recolhida.
- O espaço depois de Revisão voltou a ser livre, sem slot reservado.

## 2. Botão principal do composer

O botão no canto direito do composer agora tem quatro estados:

| Situação | Botão |
| --- | --- |
| Vazio, sessão ociosa | **Modo conversacional** (ícone de ondas) |
| Modo conversacional ativo | **Stop** (quadrado) |
| Vazio, agente executando | **Stop** para interromper o agente |
| Com texto digitado | **Enviar** (seta), inclusive durante execução |

- Texto digitado sempre prioriza **Enviar**; durante execução a mensagem entra na fila.
- Com o campo vazio e o agente rodando, o botão vira **Stop**.
- O modo conversacional não abre enquanto o agente está trabalhando. Se a conversa estiver ativa, o
  botão já está em Stop para encerrá-la.
- O Stop de execução abre a mesma confirmação de interrupção da sessão; o Stop do modo conversacional apenas encerra o modo.

## 3. Modo conversacional

- Não abre modal.
- Ao ativar, um **globo central** aparece acima do composer, com anéis, pontos e brilho animados.
- O status alterna entre **Ouvindo…** e **Respondendo…** enquanto o modo está ativo.
- O botão do composer vira Stop.
- Clicar em Stop encerra o modo e remove o globo.
- Tudo é visual e local: nenhum microfone, áudio ou chamada externa é usado.

## 4. Transcrição

- O microfone inicia uma expansão **inline**, sem modal.
- A barra expandida contém:
  - **Cancelar** à esquerda;
  - gráfico de ondas animado no centro;
  - cronômetro;
  - **Finalizar** à direita.
- Finalizar insere uma transcrição fictícia no rascunho; Cancelar descarta.
- O ícone do microfone e a seta de configuração parecem um único controle dividido.
- A seta abre a lista de entradas de áudio fictícias:
  - microfone interno;
  - headset USB;
  - interface de áudio.
- O popover mostra uma barra de **nível detectado** simulada.
- Nenhum dispositivo real é acessado.

## 5. Rodapé e modelo

- A descrição `@ arquivos · # issues` saiu da linha de ações e foi para o rodapé.
- O rodapé mostra também `⌘/Ctrl+Enter envia`.
- O modelo e o effort saíram da linha de ações e foram para o rodapé, alinhados à direita.
- O seletor é **um único componente**:
  - clique abre modelo + effort;
  - modelos: `deepseek-v4.1-flash`, `deepseek-v4.1-pro`, `glm-4.6`;
  - effort: baixo, médio, alto;
  - a escolha atualiza a sessão no simulador;
  - nenhuma chamada ao provedor é feita.

## 6. Contexto

- O anel de contexto continua no composer, antes do microfone.
- Clicar abre um popover com:
  - uso da janela em percentual e barra;
  - tokens usados e limite;
  - entrada, saída e cache;
  - custo exibido como `—` e “não informado”, sem transformar ausência em zero confirmado;
  - nota de que a contagem é local da fixture.
- O rótulo acessível continua descrevendo os tokens e o percentual.

## 7. Markdown ao digitar

- Delimitadores de código inline são ocultados: `` `redirect()` `` aparece como `redirect()`.
- Títulos e citações escondem o prefixo Markdown e mantêm o estilo.
- Negrito e itálico escondem os asteriscos.
- Blocos com três crases abrem imediatamente:
  - cabeçalho escuro com a linguagem;
  - fundo escuro;
  - destaque de sintaxe para palavras-chave, strings, números, variáveis, funções e comentários;
  - a cerca de fechamento fica discreta.
- O documento não é reescrito: as crases continuam no texto e o undo/caret permanecem nativos.
- O destaque é local e leve, não um parser completo de cada linguagem.

## 8. Anexos

- O botão `+` abre o seletor de arquivos.
- Colar ou arrastar arquivos no editor também anexa.
- Imagens mostram **thumbnail**; arquivos mostram ícone.
- Cada anexo é um `SourceRef` com nome, tipo, tamanho e proveniência.
- O upload é simulado; nenhum byte sai do navegador.
- Limite local de 8 MB por arquivo.
- Os anexos aparecem no composer e são preservados na mensagem enviada.

## 9. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. Recolha e expanda a sidebar pelo primeiro ícone da barra lateral.
2. Com o composer vazio, clique no botão de ondas; confira o globo acima do composer e o Stop.
3. Encerre o modo conversacional.
4. Clique no microfone; confira a barra inline com Cancelar e Finalizar.
5. Abra a seta do microfone e alterne a entrada; veja a barra de nível.
6. Digite texto e confira **Enviar** no lugar do modo conversacional.
7. Selecione **Durante execução**, apague o texto e confira **Stop**.
8. Abra o seletor de modelo no rodapé e troque modelo/effort.
9. Clique no anel de contexto e confira tokens, uso e custo indisponível.
10. Digite `` `redirect()` `` e um bloco ```php; confira a formatação e o destaque.
11. Anexe uma imagem e um arquivo; confira o thumbnail e o texto.

## 10. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1aa-desktop-composer-idle.png`
- `m1aa-desktop-transcription-inline.png`
- `m1aa-mobile-transcription-inline.png`
- `m1aa-desktop-running-stop.png`
- `m1aa-desktop-running-send.png`
- `m1ab-desktop-conversation-orb.png`
- `m1ab-mobile-conversation-orb.png`
- `m1z-desktop-context-popover.png`
- `m1z-desktop-model-selector.png`
- `m1z-desktop-mic-dropdown.png`
- `m1z-desktop-markdown-live.png`
- `m1z-desktop-attachments.png`

![Composer com modo conversacional, microfone e contexto](evidencias/m1aa-desktop-composer-idle.png)

![Transcrição inline com cancelar e finalizar](evidencias/m1aa-desktop-transcription-inline.png)

![Globo do modo conversacional](evidencias/m1ab-desktop-conversation-orb.png)

![Stop no lugar do envio durante execução](evidencias/m1aa-desktop-running-stop.png)

![Enviar aparece quando há texto](evidencias/m1aa-desktop-running-send.png)

![Popover de contexto](evidencias/m1z-desktop-context-popover.png)

![Modelo e effort no rodapé](evidencias/m1z-desktop-model-selector.png)

![Markdown com código e sintaxe](evidencias/m1z-desktop-markdown-live.png)

![Anexos com thumbnail](evidencias/m1z-desktop-attachments.png)

## 11. Arquivos alterados

- `src/features/workbench/WorkbenchActivityBar.tsx` — toggle da sidebar acima de Projetos.
- `src/features/workbench/WorkbenchPage.tsx` — remove controles antigos de recolher/expandir.
- `src/features/chat/PromptComposer.tsx` — estados do botão, rodapé, anexos, orbe e modelo.
- `src/features/chat/VoiceControls.tsx` — modo conversacional, transcrição inline e microfone.
- `src/features/chat/ModelSelector.tsx` — modelo + effort em um popover.
- `src/features/chat/ContextPopover.tsx` — tokens, uso, custo e métricas.
- `src/features/chat/ComposerEditor.tsx` — paste/drop de arquivos e decorações com ocultação.
- `src/features/chat/markdown-decorations.ts` — delimitadores ocultos e destaque de código.
- `src/features/chat/SourceAttachment.tsx` — thumbnail e metadados de anexo.
- `src/demo/types.ts` — metadados de anexo em `SourceRef`.
- `src/demo/simulator.ts` — ação `SET_SESSION_MODEL`.
- `src/index.css` — ondas, orbe, anéis e cores de sintaxe.
- `e2e/desktop.spec.ts` — conversa, envio/stop, transcrição, contexto, modelo, anexos e Markdown.
- `e2e/mobile.spec.ts` — botão conversacional na viewport estreita.
- Documentação: este arquivo.

## 12. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 40 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 30 testes (25 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

## 13. Limitações

- Microfone, transcrição, níveis e modo conversacional são simulações locais; não há captura de
  áudio, `getUserMedia`, transcrição real nem voz do agente.
- O globo é uma visualização CSS, não áudio.
- Modelo e effort alteram apenas a sessão do demo.
- O custo aparece como indisponível (`—`) porque o provedor não informa custo neste cenário.
- Anexos vivem em memória e não são enviados nem persistidos.
- O destaque de sintaxe do composer é uma aproximação, não um parser completo.
- Telefone físico, teclado virtual e leitor de tela manual seguem não validados.
- Sem commits, push ou deploy.
