# M1-V — plano em popover por provider e contexto no composer

Registro local de 11/11/2026. Ajuste de densidade sobre o consumo explícito do M1-T, sem mudança de
escopo. Continuam valendo os dados fictícios, o simulador local e a ausência de execução externa.

> **Anterior:** composição do split e do consumo em [`m1-t-layout.md`](m1-t-layout.md); sidebar e
> busca em [`m1-u-sidebar-search.md`](m1-u-sidebar-search.md).
>
> **Continuação:** cabeçalho unificado e menu lateral por ícones em
> [`m1-w-header-rail.md`](m1-w-header-rail.md).

## 1. O que mudou

### Drawer de consumo → popover de planos

- Clicar em **Plano** não abre mais o drawer detalhado. Abre um **popover compacto**, ancorado ao
  próprio medidor.
- O drawer e a página `/usage` continuam existindo como detalhamento; o clique rápido não passa
  mais por eles.
- O popover mostra os **providers conectados no mesmo clique**, um bloco por provider, sem abas e
  sem troca de contexto.
- Cada provider aparece com:
  - ícone próprio (cérebro para OpenCode Go, sparkles para Z.AI);
  - nome da conexão, provedor e plano;
  - estado **conectado**;
  - **janela de 5 horas** como progresso principal, com percentual;
  - **reset em h/min** calculado a partir dos dados da fixture;
  - **janela semanal** em percentual ao lado;
  - **janela mensal** na mesma linha, inclusive quando indisponível.
- O rodapé do popover reforça que os números são fictícios e que ausência não vira zero.

### Dois providers fictícios

- `Go pessoal` (OpenCode Go): 5 h em 62%, semanal 38%, mensal 24%, reset de 5 h em 2 h 2 min.
- `Z.AI pessoal` (Z.AI): 5 h em 31%, semanal 12%, mensal **não disponível**.
- `DemoState.connections` passou a ser uma lista; não existe mais `state.connection`.
- A página `/usage` ganhou abas por provider e mantém o detalhamento completo do provider ativo.

### Contexto no composer

- O rodapé do composer ganhou um **anel circular** com o percentual da janela de contexto.
- Valor atual: `18.400 / 128.000` tokens = **14%**.
- O anel é decorativo; a informação textual vai em `aria-label`/`title`:
  `Contexto: 18.400 de 128.000 tokens (14%)`.
- O indicador não ocupa espaço do campo, não interfere no envio e não depende de clique.
- Modelo e effort continuam ao lado, sem competir com o contexto.

## 2. Dependência nova

- `@radix-ui/react-popover`, usado pelo primitivo `popover` no estilo shadcn/ui.
- Nenhum backend, cobrança, credencial ou consulta a provedor foi adicionada.

## 3. Como avaliar

Servidor: **http://127.0.0.1:5173**

```text
/projects/atlas/worktrees/wt-login?view=chat
```

1. No rodapé do chat, clique em **Plano**.
2. Confirme que abre um popover, não o drawer.
3. Confira **Go pessoal** e **Z.AI pessoal** juntos, cada um com ícone.
4. Veja a janela de 5 h com barra e percentual, o reset em h/min e a semanal à direita.
5. Confira `Mensal: 24%` no Go e `Mensal: não disponível` no Z.AI.
6. Feche com `Esc` e confirme que o foco volta ao medidor.
7. No composer, confira o anel `14%` e o tooltip com os tokens.
8. Abra `/usage` e alterne entre as abas dos providers.
9. Em 390×844, repita o popover pelo chip **Plano** acima do composer.

## 4. Capturas desta rodada

Novas em `docs/dev/evidencias/`:

- `m1v-desktop-plan-popover.png`
- `m1v-desktop-composer-context.png`
- `m1v-desktop-usage-providers.png`
- `m1v-mobile-plan-popover.png`

![Popover com os dois providers](evidencias/m1v-desktop-plan-popover.png)

![Contexto no rodapé do composer](evidencias/m1v-desktop-composer-context.png)

![Abas por provider em /usage](evidencias/m1v-desktop-usage-providers.png)

![Popover do plano no mobile](evidencias/m1v-mobile-plan-popover.png)

## 5. Arquivos alterados

- `src/features/usage/PlanPopover.tsx` — popover compacto por provider, ícones e countdown.
- `src/components/ui/popover.tsx` — primitivo shadcn/Radix de popover.
- `src/features/chat/PromptComposer.tsx` — anel de contexto com rótulo acessível.
- `src/features/chat/ChatPanel.tsx` — chip mobile do plano usa o popover.
- `src/features/workbench/WorkbenchPage.tsx` — medidor desktop usa o popover.
- `src/features/ops/ConsumptionPanel.tsx` — abas de provider no detalhamento.
- `src/demo/types.ts` — `connections: Connection[]`.
- `src/demo/fixtures.ts` — dois providers e quotas fictícias.
- `e2e/desktop.spec.ts` — popover, reset, semanal, mensal e contexto.
- `e2e/mobile.spec.ts` — abertura do popover no mobile.
- `package.json`/`package-lock.json` — `@radix-ui/react-popover`.

## 6. Validação

| Verificação | Resultado |
| --- | --- |
| `npm run typecheck` | passou |
| `npm run lint` | passou, sem avisos |
| `npm test` | 39 testes |
| `npm run build` | passou; aviso existente de chunk >500 kB |
| `npm run test:e2e` | 26 testes (21 desktop + 5 mobile) |
| Lighthouse no chat desktop | acessibilidade 100, boas práticas 100, SEO 100 |

## 7. Limitações

- O countdown de reset é derivado de `readAt`/`resetAt` da fixture, não do relógio real.
- Percentuais, reset e contexto são fictícios e rotulados; não há consulta ao provedor.
- A janela mensal do Z.AI permanece explicitamente indisponível, nunca zero.
- O contexto exibido é o do primeiro provider conectado; não há seletor de provider no composer.
- O popover é de sessão: recarregar volta ao estado inicial das fixtures.
- Telefone físico, teclado virtual e leitor de tela manual seguem não validados.
- Sem commits, push ou deploy.
