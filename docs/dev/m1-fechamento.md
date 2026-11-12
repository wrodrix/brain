# M1 — relatório de fechamento

Registro local de 11/11/2026. Consolidação final do M1 do Brain: demonstração web navegável,
desktop/mobile, com dados fictícios, simulador local e nenhuma integração externa real.

> Este documento registra **prontidão técnica para aceite**, não aceite humano já recebido.
> O M1 continua sendo demonstração; M2 em diante não foi iniciado.

## 1. Estado final e reprodução

O M1.0–M1.5 está implementado no diretório `brain` e preserva as revisões visuais posteriores ao
primeiro corte: chat com shadcn AI Elements, sidebar recolhível com busca, editor lateral
redimensionável, plano em popover, cabeçalho unificado, barra de atividades, status de execução no
fim da resposta e composer com voz/modelo/contexto/anexos simulados.

```bash
npm install
npm run dev
```

Aplicação local: **http://127.0.0.1:5173**

Rotas principais:

```text
/                                              Projetos
/projects/atlas                                Projeto e worktrees
/projects/atlas/worktrees/wt-login?view=chat   Chat
/projects/atlas/worktrees/wt-login?view=files  Arquivos
/projects/atlas/worktrees/wt-login?view=jobs   Background
/projects/atlas/worktrees/wt-login?view=review Revisão e gates
/projects/atlas/worktrees/wt-login?view=usage  Consumo no worktree
/usage                                         Cotas e conexões
/settings                                      Configurações ilustrativas
```

O banner fixo permite trocar entre os cenários **Conversa concluída**, **Durante execução**,
**Aguardando aprovação**, **Setup falhou**, **Revisão desatualizada** e **Rede instável**, além de
reproduzir, avançar, pausar e reiniciar. O estado é de sessão; recarregar reinicia as fixtures.

## 2. Correções e acabamentos desta consolidação

- **Custo desconhecido não vira zero:** o popover de contexto passou a exibir `—` e “Não informado
  pelo provedor neste demo”, em vez de `US$ 0,00`.
- **Modelo/effort explicitamente ilustrativos:** o seletor informa que a escolha é local do demo e
  não representa capacidade verificada do provedor.
- **Voz explicitamente simulada:** o modo conversacional ganhou a linha “Simulação local, sem áudio
  real”; a barra de transcrição informa que nenhum áudio é capturado.
- **Foco após mudança de modo:** iniciar/encerrar o modo conversacional devolve o foco ao botão
  substituto; iniciar/cancelar/finalizar a transcrição devolve o foco ao microfone.
- **Menos ruído para leitor de tela:** o status visual “Ouvindo/Respondendo” deixou de ser uma
  região `aria-live` que anunciava a cada ciclo.
- **Expectativas atualizadas, não removidas:** testes E2E foram ajustados para os novos controles
  (contexto como botão, conversa sem modal, microfone inline, custo indisponível, anexos e
  Markdown), preservando as garantias comportamentais.
- **Documentação e evidências atualizadas:** este relatório, correções em `m1-y` e capturas novas
  `m1close-*`, sem apagar as capturas anteriores.

Nenhuma biblioteca, arquitetura visual ou funcionalidade substancial foi adicionada nesta etapa.

## 3. Verificações automatizadas

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | **40 testes em 7 arquivos**, todos passaram |
| `npm run build` | passou; permanece o aviso de chunk >500 kB |
| `npm run test:e2e` | **30 testes** (25 desktop + 5 mobile), todos passaram |
| Lighthouse (chat desktop) | acessibilidade **100**, boas práticas **100**, SEO **100**; sem falhas |
| Auditoria de layout | 10 rotas × larguras 360, 390, 768, 1024, 1280 e 1440; sem overflow horizontal |
| Console/rede nos E2E | sem erro não tratado e sem requisição externa inesperada |

Versões observadas: Node 25.2.1, npm 11.6.2, React 19.3.1, Vite 7.3.8, Tailwind CSS 4.3.5,
Vitest 4.1.12, Playwright 1.65.0.

A cobertura E2E inclui navegação e banner; composer com Markdown, caret, undo, colagem e menções;
fila durante execução; foco e rascunho de issues; conflito de arquivo; busca e inclusão explícita no
prompt; subagente sem alterar o pai; gates/merge/remoção; painéis operacionais; cenários de falha e
rede instável; reset; roteiro guiado; plano/contexto; cabeçalho e barra de atividades; modo
conversacional, transcrição, anexos, modelo/effort e Markdown com código; mobile, overlay, diff e
busca.

## 4. Inspeções manuais realizadas

Inspeção visual real no Chromium local, complementada por scripts Playwright de foco e layout:

- Desktop **1440×900**: projetos, projeto, chat, plano, contexto, issues, arquivos/editor, revisão,
  background, processos, terminal, cotas e configurações.
- Desktop **1280×800**: chat e cabeçalho compacto.
- Mobile emulado **390×844** e **360×800**: chat, arquivos e overlay de issues; sem overflow.
- Teclado/foco: contexto e modelo devolvem foco; conversa e microfone devolvem foco após alternar;
  overlay de issues devolve foco ao disparador; Escape fecha popovers/dialogs testados.
- Markdown: delimitadores ocultos continuam no texto; copiar o composer preserva crases e fences.
- Estados de falha: setup falho bloqueia envio e mantém logs; rede instável mantém histórico e
  desabilita ações externas; revisão desatualizada bloqueia merge.

Capturas desta inspeção estão na seção 5. Elas são capturas reais da implementação local.

## 5. Evidências

Novas capturas em `docs/dev/evidencias/`:

**Desktop**

- `m1close-desktop-projects.png`
- `m1close-desktop-project.png`
- `m1close-desktop-chat.png`
- `m1close-desktop-1280-chat.png`
- `m1close-desktop-plan.png`
- `m1close-desktop-context.png`
- `m1close-desktop-issues.png`
- `m1close-desktop-files.png`
- `m1close-desktop-review.png`
- `m1close-desktop-background.png`
- `m1close-desktop-processes.png`
- `m1close-desktop-terminal.png`
- `m1close-desktop-usage.png`
- `m1close-desktop-usage-zai.png`
- `m1close-desktop-setup-failed.png`
- `m1close-desktop-network.png`

**Mobile**

- `m1close-mobile-projects.png`
- `m1close-mobile-chat.png`
- `m1close-mobile-issues.png`
- `m1close-mobile-files.png`
- `m1close-mobile-360-chat.png`

**Composer e atividade (rodada anterior preservada)**

- `m1aa-desktop-composer-idle.png`
- `m1aa-desktop-transcription-inline.png`
- `m1ab-desktop-conversation-orb.png`
- `m1aa-desktop-running-stop.png`
- `m1aa-desktop-running-send.png`
- `m1z-desktop-markdown-live.png`
- `m1z-desktop-attachments.png`

![Projetos no desktop](evidencias/m1close-desktop-projects.png)

![Chat no desktop](evidencias/m1close-desktop-chat.png)

![Contexto sem custo confirmado](evidencias/m1close-desktop-context.png)

![Issues em overlay](evidencias/m1close-desktop-issues.png)

![Revisão e gates](evidencias/m1close-desktop-review.png)

![Chat no mobile](evidencias/m1close-mobile-chat.png)

![Issues no mobile](evidencias/m1close-mobile-issues.png)

## 6. O que continua simulado

| Área | Natureza no M1 |
| --- | --- |
| Agente, streaming, raciocínio e subagentes | Eventos e textos de fixture; nenhum modelo é chamado. |
| Projetos, worktrees, setup e arquivos | Identidades e conteúdo fictícios; nada é lido/escrito no host. |
| Git, PR, gates, merge e remoção | Estados de cenário; nenhum comando Git ou chamada GitHub. |
| Terminal, preview e processos | Saída reproduzida e métricas fictícias; sem PTY, porta ou processo real. |
| Issues e comentários | Edição/publicação apenas em memória; sem escrita externa. |
| Auth, conexões, chaves, MCP e dispositivos | Representação visual; nenhuma credencial é solicitada ou armazenada. |
| Cotas e consumo | Números de exemplo ou indisponíveis; custo desconhecido aparece como `—`. |
| Voz e transcrição | Ondas, globo e texto simulados; nenhum microfone ou áudio real. |
| Anexos e thumbnails | Arquivos locais em memória; nenhum upload externo. |
| Modelo e effort | Opções ilustrativas; a escolha altera apenas a sessão do demo. |

## 7. Verificações não realizadas

- Telefone físico, teclado virtual iOS/Android, orientação e retorno de suspensão.
- Leitor de tela manual (VoiceOver, TalkBack ou NVDA).
- Firefox e WebKit.
- Zoom de navegador em 200%/400%.
- Microfone real, permissão de áudio, transcrição real e voz do agente.
- Upload persistente, anexos após reload e armazenamento durável.
- Qualquer integração real de Go, GitHub, shell, PTY, preview ou processos.

Emulação móvel e Lighthouse **não** comprovam os itens acima.

## 8. Pendências

**Bloqueantes:** nenhuma encontrada.

**Não bloqueantes:**

- validação em aparelho físico e leitor de tela manual;
- cobertura de Firefox/WebKit;
- aviso de chunk >500 kB no build único;
- estado apenas em memória, sem persistência após reload;
- voz, anexos, modelo/effort e custo continuam simulados/ilustrativos por escopo do M1;
- pequenos overlays de chips flutuantes ainda podem cobrir conteúdo antigo ao rolar para cima.

## 9. Limitações para o próximo marco

Persistência durável, auth, banco, journal, conector Linux, PTY, filesystem real, Git/GitHub real,
execução de modelo, transcrição real, anexos remotos e custos reais pertencem a M2–M5. O M1 não
comprova segurança, isolamento, operação Linux, cobrança, recuperação após reboot ou autorização.

## 10. Diagnóstico

**Pronto para aceite do M1, com ressalvas não bloqueantes.**

As jornadas principais, os estados de falha, a responsividade emulada, o foco/teclado dos fluxos
revisados, a transparência do demonstrador e as verificações automatizadas estão consistentes. As
ressalvas são as validações físicas e cross-browser listadas acima, além da natureza integralmente
simulada do recorte.

Esse diagnóstico **não substitui** o aceite humano nem autoriza M2, commit, push, deploy ou
publicação. Nenhum desses passos foi executado.
