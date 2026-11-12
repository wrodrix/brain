import { expect, test } from "@playwright/test"

const MOD = process.platform === "darwin" ? "Meta" : "Control"

import { expectClean, expectNoHorizontalOverflow, monitorDemo, openWorktree } from "./helpers"

test.describe("jornadas desktop", () => {
  test("projetos, worktree e banner não fazem chamadas externas", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await page.goto("/")
    await expect(page.getByText("Demonstração — dados fictícios, sem execução real")).toBeVisible()
    await expect(page.getByRole("heading", { name: "Projetos e trabalho" })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Atlas/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: /Campo/ })).toBeVisible()
    await expect(page.getByRole("heading", { name: "Checkouts removidos" })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await openWorktree(page)
    await expect(page.getByText("Implementação").first()).toBeVisible()
    await expect(page.getByRole("heading", { name: "Implementação" })).toHaveCount(0)
    await expect(page.getByText("Linux-A · Go pessoal")).toBeVisible()
    await expect(page.getByText("issue-142-login").first()).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("composer formata Markdown, preserva caret/undo e enfileira durante execução", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("during-run")
    const editor = page.getByTestId("composer-editor")
    await editor.click()

    await page.keyboard.type("# Plano E2E")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("Use `redirect()` no teste.")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("> trecho citado")
    await page.keyboard.press("Enter")
    await page.keyboard.press("Enter")
    await page.keyboard.type("```php")
    await page.keyboard.press("Enter")
    await page.keyboard.type("return redirect()->intended('/reports');")
    await page.keyboard.press("Enter")
    await page.keyboard.type("```")

    await expect(page.locator(".md-live-heading").first()).toBeVisible()
    await expect(page.locator(".md-live-inline-code").first()).toHaveText("redirect()")
    await expect(page.locator(".cm-md-code-line").first()).toBeVisible()
    await expect(page.locator(".cm-syn-keyword").first()).toBeVisible()
    await expect(page.locator(".cm-md-heading-1").first()).toBeVisible()

    // Caret and undo stay native while decorations update.
    await page.keyboard.type("ABC")
    await page.keyboard.press("ArrowLeft")
    await page.keyboard.type("X")
    await expect(editor).toContainText("ABXC")
    await page.keyboard.press(`${MOD}+z`)
    await expect(editor).toContainText("ABC")
    await expect(editor).not.toContainText("ABXC")

    await page.evaluate(async () => navigator.clipboard.writeText("Texto colado E2E"))
    await editor.click()
    await page.keyboard.press(`${MOD}+v`)
    await expect(editor).toContainText("Texto colado E2E")

    await page.keyboard.type(" Enviar durante execução")
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    const queueToggle = page.getByRole("button", { name: /Fila deste worktree/ })
    await expect(queueToggle).toBeVisible()
    await expect(queueToggle).toContainText("2")
    await expect(page.getByText("aguardando entrega").first()).toBeVisible()

    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await expect(page.getByText("entregue", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await expect(page.getByText("incorporada", { exact: true }).first()).toBeVisible()
    await expect(editor).toBeVisible()

    await expectClean(monitor, testInfo)
  })

  test("composer alterna conversa, envio e stop e transcreve áudio simulado", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const conversation = page.getByRole("button", { name: "Abrir modo conversacional" })
    const send = page.getByRole("button", { name: "Enviar", exact: true })
    const stop = page.getByRole("button", { name: "Parar execução" })
    const editor = page.getByTestId("composer-editor")

    await expect(conversation).toBeVisible()
    await expect(send).toHaveCount(0)
    await conversation.click()
    await expect(page.getByRole("button", { name: "Encerrar modo conversacional" })).toBeVisible()
    await expect(page.getByText(/Modo conversacional/)).toBeVisible()
    await expect(page.locator('[role="dialog"][data-state="open"]')).toHaveCount(0)
    await page.getByRole("button", { name: "Encerrar modo conversacional" }).click()
    await expect(conversation).toBeVisible()

    await page.getByRole("button", { name: "Configurar microfone" }).click()
    await expect(page.getByText("Entrada de áudio")).toBeVisible()
    await expect(page.getByRole("button", { name: /Headset USB/ })).toBeVisible()
    await expect(page.getByRole("progressbar", { name: /Nível de áudio simulado/ })).toBeVisible()
    await page.getByRole("button", { name: /Headset USB/ }).click()
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Iniciar transcrição" }).click()
    await expect(page.getByRole("button", { name: "Cancelar transcrição" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Finalizar transcrição" })).toBeVisible()
    await expect(page.locator(".voice-wave-bar").first()).toBeVisible()
    await page.getByRole("button", { name: "Cancelar transcrição" }).click()
    await expect(page.getByRole("button", { name: "Iniciar transcrição" })).toBeVisible()
    await page.getByRole("button", { name: "Iniciar transcrição" }).click()
    await page.getByRole("button", { name: "Finalizar transcrição" }).click()
    await expect(editor).toContainText("Ajuste o retorno após o login")
    await expect(send).toBeVisible()
    await editor.click()
    await page.keyboard.press(`${MOD}+a`)
    await page.keyboard.press("Backspace")
    await expect(conversation).toBeVisible()

    await page.getByLabel("Cenário de demonstração").selectOption("during-run")
    await expect(stop).toBeVisible()
    await expect(conversation).toHaveCount(0)
    await editor.click()
    await page.keyboard.type("Mensagem durante execução")
    await expect(send).toBeVisible()
    await expect(stop).toHaveCount(0)
    await page.keyboard.press(`${MOD}+a`)
    await page.keyboard.press("Backspace")
    await expect(stop).toBeVisible()
    await stop.click()
    await expect(page.getByRole("dialog")).toContainText("Interromper o agente?")
    await page.getByRole("button", { name: "Cancelar" }).click()
    await expectClean(monitor, testInfo)
  })

  test("contexto, modelo e anexos ficam no composer", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)

    await page.getByRole("button", { name: /Contexto:/ }).click()
    const context = page.getByRole("dialog").filter({ hasText: "Janela de contexto" })
    await expect(context).toContainText("Janela de contexto")
    await expect(context).toContainText("18.400 de 128.000 tokens")
    await expect(context).toContainText("Não informado pelo provedor")
    await expect(context).toContainText("Entrada")
    await expect(context).toContainText("45.210")
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: /deepseek-v4.1-flash · alto/ }).click()
    const models = page.getByRole("dialog").filter({ hasText: "Modelo e effort" })
    await expect(models).toContainText("Modelo e effort")
    await models.getByRole("button", { name: "Médio" }).click()
    await models.getByRole("button", { name: /glm-4.6/ }).click()
    await page.keyboard.press("Escape")
    await expect(
      page.getByRole("button", { name: /glm-4.6 · médio/ }),
    ).toBeVisible()

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"><rect width="16" height="16" fill="#0f766e"/></svg>`
    await page.setInputFiles('input[type="file"]', [
      { name: "login-shot.svg", mimeType: "image/svg+xml", buffer: Buffer.from(svg) },
      { name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("notas") },
    ])
    await expect(page.getByText("notes.txt")).toBeVisible()
    await expect(page.getByText("login-shot.svg")).toBeVisible()
    await expect(page.getByAltText("Prévia de login-shot.svg")).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("execução mostra status no fim e Esc abre a interrupção", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("during-run")
    const activity = page.getByRole("button", {
      name: /Interromper execução/,
    })
    await expect(activity).toBeVisible()
    await activity.hover()
    await expect(activity.getByText("Interromper", { exact: true })).toBeVisible()

    await page.keyboard.press("Escape")
    const dialog = page.getByRole("dialog")
    await expect(dialog).toContainText("Interromper o agente?")
    await dialog.getByRole("button", { name: "Cancelar" }).click()
    await expect(dialog).toBeHidden()
    await expect(activity).toBeVisible()

    await page.keyboard.press("Escape")
    await expect(dialog).toContainText("Atalho: Esc")
    await dialog.getByRole("button", { name: "Interromper execução" }).click()
    await expect(page.getByText(/Execução interrompida pelo usuário/)).toBeVisible()
    await expect(activity).toHaveCount(0)
    await expectClean(monitor, testInfo)
  })

  test("atividade usa linhas compactas e detalhes sob demanda", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const toolLine = page.getByRole("button", { name: /php artisan test tests\/Feature\/LoginRedirectTest/ })
    await expect(toolLine).toBeVisible()
    await expect(toolLine).toContainText("concluído")
    await expect(page.getByText("1 test passed · exit 0")).toHaveCount(0)
    await toolLine.click()
    await expect(page.getByText("1 test passed · exit 0")).toBeVisible()

    const subagent = page.getByRole("button", { name: /Subagente de revisão concluiu/ })
    await expect(subagent).toBeVisible()
    await subagent.click()
    await expect(page.getByText("1 arquivo revisado, nenhuma escrita.")).toBeVisible()
    await page.getByRole("button", { name: "Ver sessão filha" }).click()
    await expect(page.getByRole("dialog")).toContainText("Job de subagente")
    await page.getByRole("button", { name: "Abrir sessão filha" }).click()
    await expect(page.getByText("Sessão filha própria.")).toBeVisible()
    await page.getByRole("button", { name: "Fechar", exact: true }).last().click()

    await page.getByRole("button", { name: "Copiar código" }).click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("$target = $request->session()")
    await page.getByRole("button", { name: "Copiar resposta" }).click()
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain("O destino original agora é preservado")

    await page.getByLabel("Cenário de demonstração").selectOption("during-run")
    await page.getByTestId("chat-scroll").evaluate((element) => {
      element.scrollTop = 0
    })
    const generating = page.getByRole("button", { name: /Preparar inspeção do retorno/ })
    await expect(generating).toBeAttached()
    await generating.click()
    await expect(page.getByText("Argumentos ainda em geração. A chamada não foi executada.")).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("aprovação fica evidente, permite e recusa sem simular sucesso", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("approval")
    await expect(page.getByText("Executar php artisan migrate:fresh --env=staging?")).toBeVisible()
    await page.getByRole("button", { name: "Permitir" }).click()
    await expect(page.getByText("Executar php artisan migrate:fresh --env=staging?")).toBeHidden()
    await expect(page.getByText("executando").first()).toBeVisible()

    await page.getByLabel("Cenário de demonstração").selectOption("approval")
    await expect(page.getByRole("button", { name: "Recusar" })).toBeVisible()
    await page.getByRole("button", { name: "Recusar" }).click()
    await expect(page.getByRole("button", { name: "Permitir" })).toHaveCount(0)
    await expect(page.getByText("recusada").first()).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("leitura antiga não é puxada pelo streaming e Recentes retorna ao fim", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("during-run")
    const scroller = page.getByTestId("chat-scroll")
    await scroller.evaluate((element) => {
      element.scrollTop = 0
      element.dispatchEvent(new WheelEvent("wheel", { deltaY: -1, bubbles: true }))
    })
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBeLessThan(24)
    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBeLessThan(24)

    const recent = page.getByRole("button", { name: /Recentes/ })
    await expect(recent).toBeVisible()
    await recent.click()
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(100)
    await expectClean(monitor, testInfo)
  })

  test("sidebar colapsa e o split do arquivo é redimensionável", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page, "files")
    const sidebar = page.getByRole("complementary", {
      name: "Worktree, sessões e arquivos",
    })
    await expect(sidebar).toBeVisible()
    const reviewButton = page
      .locator("header.shrink-0")
      .getByRole("button", { name: "Revisão" })
    const reviewBefore = await reviewButton.boundingBox()
    await page.getByRole("button", { name: "Recolher sidebar" }).click()
    await expect(sidebar).toBeHidden()
    await expect(page.getByRole("button", { name: "Expandir sidebar" })).toBeVisible()
    const reviewAfter = await reviewButton.boundingBox()
    expect(Math.abs((reviewAfter?.x ?? 0) - (reviewBefore?.x ?? 0))).toBeLessThan(1)
    await page.getByRole("button", { name: "Expandir sidebar" }).click()
    await expect(sidebar).toBeVisible()

    const filePanel = page.locator('[data-slot="resizable-panel"]').nth(1)
    const handle = page.locator('[data-slot="resizable-handle"]')
    await expect(handle).toBeVisible()
    const before = await filePanel.boundingBox()
    const handleBox = await handle.boundingBox()
    if (!before || !handleBox) throw new Error("split não encontrado")
    await page.mouse.move(handleBox.x + 1, handleBox.y + handleBox.height / 2)
    await page.mouse.down()
    await page.mouse.move(handleBox.x - 90, handleBox.y + handleBox.height / 2, { steps: 8 })
    await page.mouse.up()
    const after = await filePanel.boundingBox()
    expect(after?.width ?? 0).toBeGreaterThan(before.width + 40)
    await expectClean(monitor, testInfo)
  })

  test("cabeçalho unificado e menu lateral por ícones", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)

    await expect(page.getByRole("navigation", { name: "Navegação principal" })).toHaveCount(0)
    const header = page.locator("header.shrink-0")
    await expect(header.getByRole("link", { name: "Brain — ir para projetos" })).toBeVisible()
    await expect(header.getByRole("button", { name: "Buscar sessões" })).toBeVisible()
    await expect(header.getByRole("button", { name: "Abrir issues" })).toBeVisible()
    await expect(header.getByRole("button", { name: /Menu da conta de/ })).toBeVisible()

    const rail = page.getByRole("navigation", { name: "Menu do worktree" })
    await expect(rail).toBeVisible()
    await expect(rail.getByRole("link", { name: "Projetos" })).toBeVisible()
    await expect(rail.getByRole("button", { name: "Buscar" })).toBeVisible()
    await expect(rail.getByRole("button", { name: "Issues" })).toBeVisible()
    await expect(rail.getByRole("link", { name: "Cotas" })).toBeVisible()
    await expect(rail.getByRole("link", { name: "Configurações" })).toBeVisible()

    await rail.getByRole("button", { name: "Buscar" }).click()
    await expect(page.getByRole("dialog")).toContainText("Buscar no histórico de sessões")
    await page.keyboard.press("Escape")
    await expect(page.getByRole("dialog")).toBeHidden()
    await expectClean(monitor, testInfo)
  })

  test("popover do plano mostra provedores, janela de 5h, reset e semanal", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const planTrigger = page.getByRole("button", { name: /Plano/ })
    await expect(planTrigger).toBeVisible()
    await planTrigger.click()
    const popover = page.getByRole("dialog")
    await expect(popover).toContainText("Planos conectados")
    await expect(popover.getByText("Go pessoal")).toBeVisible()
    await expect(popover.getByText("Z.AI pessoal")).toBeVisible()
    await expect(popover.getByText(/reset em 2 h 2 min/)).toBeVisible()
    await expect(popover.getByText("Semanal").first()).toBeVisible()
    await expect(popover.getByText(/Mensal: 24%/)).toBeVisible()
    await expect(popover.getByText(/Mensal: não disponível/)).toBeVisible()
    await page.keyboard.press("Escape")
    await expectClean(monitor, testInfo)
  })

  test("contexto da sessão aparece no composer com percentual", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await expect(
      page.getByRole("button", {
        name: /Contexto: 18\.400 de 128\.000 tokens \(14%\)/,
      }),
    ).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("overlay de issue preserva rascunho, foco e menciona sem publicar", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)

    await page.getByRole("button", { name: "Abrir issues" }).click()
    const comment = page.getByLabel("Novo comentário")
    await expect(comment).toBeVisible()
    await comment.fill("Rascunho E2E preservado ao fechar")
    await page.getByRole("button", { name: "Fechar painel de issues" }).click()
    await expect(comment).toBeHidden()

    const focused = await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))
    expect(focused).toBe("Abrir issues")

    await page.getByRole("button", { name: "Abrir issues" }).click()
    await expect(page.getByLabel("Novo comentário")).toHaveValue(
      "Rascunho E2E preservado ao fechar",
    )
    await page.getByRole("button", { name: /Mencionar no prompt/ }).click()
    await expect(page.getByText(/adicionada ao rascunho de Implementação/)).toBeVisible()
    await page.getByRole("button", { name: "Fechar painel de issues" }).click()
    await expect(page.getByRole("button", { name: /equipe\/atlas#142/ }).first()).toBeVisible()
    await expect(page.getByText("equipe/atlas#142").first()).toBeVisible()

    // Comment count did not change.
    await page.getByRole("button", { name: "Abrir issues" }).click()
    await expect(page.getByText("3/3 carregados")).toBeVisible()
    await expect(page.getByLabel("Novo comentário")).toHaveValue(
      "Rascunho E2E preservado ao fechar",
    )
    await page.keyboard.press("Escape")
    await expect(page.getByLabel("Novo comentário")).toBeHidden()
    await expect(page.getByRole("button", { name: "Abrir issues" })).toBeFocused()
    await expectClean(monitor, testInfo)
  })

  test("arquivos editam em memória e conflito bloqueia sobrescrita", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page, "files")
    await expect(page.getByRole("tree")).toBeVisible()
    const fileSearch = page.getByLabel("Buscar arquivo no worktree")
    await fileSearch.fill("LoginRedirect")
    await expect(page.getByRole("tree").getByRole("button", { name: /LoginRedirectTest/ })).toBeVisible()
    await expect(page.getByRole("tree").getByRole("button", { name: /LoginController/ })).toHaveCount(0)
    await fileSearch.fill("")
    await page.getByRole("tab", { name: "Editar" }).click()
    const editor = page.getByTestId("code-editor")
    await editor.click()
    await page.keyboard.type("\n// buffer humano E2E")
    await expect(page.getByText("buffer modificado, não salvo")).toBeVisible()

    await page.getByRole("button", { name: "Simular mudança externa" }).click()
    await expect(page.getByText("O arquivo mudou no ambiente desde que foi aberto.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Salvar" })).toBeDisabled()

    await page.getByRole("button", { name: "Comparar versões" }).click()
    await expect(page.getByRole("heading", { name: /Comparar versões/ })).toBeVisible()
    await page.getByRole("button", { name: "Usar versão do disco" }).click()
    await expect(
      page.getByText("O arquivo mudou no ambiente desde que foi aberto."),
    ).toBeHidden()
    await expect(editor).toContainText("Alteração externa simulada")

    await editor.click()
    await page.keyboard.type("\n// salvo no cenário")
    await page.getByRole("button", { name: "Salvar" }).click()
    await expect(page.getByText("Arquivo salvo apenas em memória.")).toBeVisible()
    await expect(page.getByText(/v9/).first()).toBeVisible()

    await page.getByRole("button", { name: /logo\.png/ }).click()
    await expect(page.getByText("Arquivo binário")).toBeVisible()
    await expect(page.getByTestId("code-editor")).toHaveCount(0)
    await page.getByRole("button", { name: /session-dump\.json/ }).click()
    await expect(page.getByText("Arquivo grande")).toBeVisible()
    await page.getByRole("button", { name: /legacy-auth\.php/ }).click()
    await expect(page.getByText("Conteúdo indisponível")).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("busca abre o trecho e adiciona ao prompt em ação separada", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByRole("button", { name: /Buscar sessões/ }).first().click()
    const search = page.getByLabel("Termo de busca no histórico")
    await search.fill("redirect")
    await expect(page.getByRole("button", { name: "Abrir neste trecho" }).first()).toBeVisible()
    await page.getByRole("button", { name: "Abrir neste trecho" }).first().click()
    await expect(page).toHaveURL(/message=/)
    await expect(page.getByText("Implementação").first()).toBeVisible()

    await page.getByRole("button", { name: /Buscar sessões/ }).first().click()
    await expect(page.getByLabel("Termo de busca no histórico")).toHaveValue("redirect")
    await page.getByRole("button", { name: "Adicionar ao prompt" }).first().click()
    await expect(page.getByText(/Trecho adicionado ao rascunho/)).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByText("Trecho do histórico").first()).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("menções exigem seleção explícita e não invadem e-mail ou código", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const editor = page.getByTestId("composer-editor")
    await editor.click()

    await page.keyboard.type("Contato: pessoa@exemplo.com")
    await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0)
    await page.keyboard.press(`${MOD}+a`)
    await page.keyboard.press("Backspace")
    await page.keyboard.type("# Plano")
    await expect(page.locator(".cm-tooltip-autocomplete")).toHaveCount(0)

    await page.keyboard.press(`${MOD}+a`)
    await page.keyboard.press("Backspace")
    await page.keyboard.type("@Log")
    await expect(page.locator(".cm-tooltip-autocomplete")).toBeVisible()
    await page.locator(".cm-tooltip-autocomplete li").first().click()
    await expect(page.getByRole("button", { name: "LoginController.php" }).last()).toBeVisible()
    await page.getByTitle(/inspecionar conteúdo/).last().click()
    await expect(page.getByRole("heading", { name: "LoginController.php" })).toBeVisible()
    await expect(page.getByText(/class LoginController/)).toBeVisible()
    await page.getByRole("button", { name: "Fechar", exact: true }).last().click()

    await editor.click()
    await page.keyboard.press(`${MOD}+a`)
    await page.keyboard.press("Backspace")
    await page.keyboard.type("#142")
    await expect(page.locator(".cm-tooltip-autocomplete")).toBeVisible()
    await page.locator(".cm-tooltip-autocomplete li").first().click()
    await expect(page.getByText("equipe/atlas#142").first()).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("abrir job/sessão filha não altera o rascunho nem o contexto do pai", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const editor = page.getByTestId("composer-editor")
    await editor.click()
    await page.keyboard.type("Rascunho que não pode desaparecer")
    const scroller = page.getByTestId("chat-scroll")
    await scroller.evaluate((element) => {
      element.scrollTop = Math.min(140, element.scrollHeight)
    })
    await expect
      .poll(() => scroller.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)
    await page.getByRole("button", { name: /Background/ }).click()
    await page.getByRole("button", { name: "Abrir detalhes" }).nth(1).click()
    await expect(page.getByText("revisão de login").first()).toBeVisible()
    await page.getByRole("button", { name: "Abrir sessão filha" }).click()
    await expect(page.getByText("Sessão filha própria.")).toBeVisible()
    await page.getByText("Sobre esta visualização").click()
    await expect(page.getByText("Abrir o detalhe não injeta o transcript")).toBeVisible()
    await page.getByRole("button", { name: "Fechar", exact: true }).last().click()
    await page.getByRole("button", { name: "Fechar painel de recursos" }).click()
    await expect(editor).toContainText("Rascunho que não pode desaparecer")
    await expect(page.getByText("O redirect após autenticação")).toBeVisible()
    await expect
      .poll(async () => scroller.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0)
    await expectClean(monitor, testInfo)
  })

  test("gates, merge em fila e remoção manual preservam o worktree", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page, "review")
    await expect(page.getByText("Gates e checks")).toBeVisible()
    await expect(page.getByText("em execução").first()).toBeVisible()
    const merge = page.getByRole("button", { name: /Fazer merge/ })
    await expect(merge).toBeDisabled()

    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await expect(page.getByRole("button", { name: /Fazer merge/ })).toBeEnabled()
    await page.getByRole("button", { name: /Fazer merge/ }).click()
    await expect(page.getByText("solicitado · em fila")).toBeVisible()
    await expect(page.getByText("Integração confirmada no cenário.")).toBeHidden()

    await page.getByRole("button", { name: "Avançar um evento" }).click()
    await expect(page.getByText("Integração confirmada no cenário.")).toBeVisible()
    await expect(page.getByRole("heading", { name: "issue-142-login" })).toBeVisible()

    await page.getByRole("button", { name: /Remover worktree/ }).click()
    await page.getByRole("checkbox", { name: "Confirmar remoção fictícia" }).check()
    await page.getByRole("button", { name: /Confirmar remoção/ }).click()
    await expect(page.getByText(/Worktree removido do cenário/)).toBeVisible()
    await expect(page.getByRole("button", { name: "Checkout já removido" })).toBeVisible()

    await page.getByRole("button", { name: /Conversa/ }).click()
    await expect(page.getByText("Checkout removido — histórico preservado.")).toBeVisible()
    await expect(page.getByText("Implementação").first()).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("painéis operacionais não fingem execução nem inventam métricas", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await page.goto("/usage")
    await expect(page.getByText("Uso do plano", { exact: true })).toBeVisible()
    await expect(page.getByText("Janela de 5 horas").first()).toBeVisible()
    await expect(page.getByText("62%").first()).toBeVisible()
    await expect(page.getByText("não verificado", { exact: true })).toBeVisible()

    await page.goto("/projects/atlas/worktrees/wt-login?view=terminal")
    await expect(page.getByText("Sem shell conectada.")).toBeVisible()
    await expect(page.getByRole("button", { name: "C", exact: true })).toBeDisabled()

    await page.goto("/projects/atlas/worktrees/wt-login?view=preview")
    await expect(page.getByText("O demo não abre URLs.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Abrir em nova aba" }).first()).toBeDisabled()

    await page.goto("/projects/atlas/worktrees/wt-login?view=processes")
    await expect(page.getByText("Playwright / job-tests")).toBeVisible()
    await expect(page.getByText("não disponível").first()).toBeVisible()
    await page.getByRole("button", { name: /Encerrar Playwright/ }).click()
    await page.getByRole("checkbox", { name: "Confirmar encerramento do recurso" }).check()
    await page.getByRole("button", { name: /Confirmar encerramento/ }).click()
    await page.getByRole("button", { name: "Encerrados" }).click()
    await expect(page.getByText("encerrado no cenário").first()).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("configurações distinguem autenticação real de projeto fictício", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await page.goto("/settings")
    await expect(page.getByText("Conta e acesso")).toBeVisible()
    await expect(page.getByRole("link", { name: "Abrir sessões e dispositivos" })).toBeVisible()
    await page.getByRole("tab", { name: "Acesso" }).click()
    await expect(page.getByRole("heading", { name: /Este navegador/ })).toBeVisible()
    await expect(page.getByText("Trocar senha")).toBeVisible()
    await expect(page.getByText("auth real · projeto fictício")).toBeVisible()
    await expectClean(monitor, testInfo)
  })
})
