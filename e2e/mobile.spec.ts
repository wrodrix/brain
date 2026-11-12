import { expect, test } from "@playwright/test"

import { expectClean, expectNoHorizontalOverflow, monitorDemo, openWorktree } from "./helpers"

test.describe("jornadas mobile", () => {
  test("navegação estreita não comprime três colunas e mantém o banner", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await page.goto("/")
    await expect(page.getByText("Demonstração — dados fictícios, sem execução real")).toBeVisible()
    await expect(page.getByRole("navigation", { name: "Navegação móvel" })).toBeVisible()
    await expect(page.getByRole("link", { name: "Projetos", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Buscar", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Issues", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Mais", exact: true })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    await page.keyboard.press("Tab")
    await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeFocused()

    await openWorktree(page)
    await expect(page.getByRole("navigation", { name: "Navegação do worktree" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Chat", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Arquivos", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Background", exact: true })).toBeVisible()
    await expect(page.getByRole("button", { name: "Mais", exact: true })).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Abrir modo conversacional" }),
    ).toBeInViewport()
    await page.getByRole("button", { name: /Plano/ }).click()
    await expect(page.getByRole("dialog")).toContainText("Z.AI pessoal")
    await page.keyboard.press("Escape")
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("overlay de issue alterna lista/detalhe e devolve foco", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByRole("button", { name: "Abrir issues" }).click()
    await expect(page.getByLabel("Novo comentário")).toBeVisible()
    const back = page.getByRole("button", { name: "Voltar para a lista de issues" })
    await expect(back).toBeVisible()
    await back.click()
    await expect(page.getByRole("button", { name: /#142/ })).toBeVisible()
    await page.getByRole("button", { name: /#142/ }).click()
    const comment = page.getByLabel("Novo comentário")
    await comment.fill("Rascunho mobile preservado")
    await page.getByRole("button", { name: "Fechar painel de issues" }).click()
    await expect(comment).toBeHidden()
    await expect(page.getByRole("button", { name: "Abrir issues" })).toBeFocused()

    await page.getByRole("button", { name: "Abrir issues" }).click()
    await expect(page.getByLabel("Novo comentário")).toHaveValue("Rascunho mobile preservado")
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("arquivos usam árvore e diff unificado em tela estreita", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page, "files")
    await expect(page.getByRole("tree")).toBeVisible()
    await page.getByRole("button", { name: /LoginController\.php/ }).click()
    await expect(page.getByRole("button", { name: "Árvore" })).toBeVisible()
    await page.getByRole("tab", { name: "Diff" }).click()
    await expect(page.getByText("Diff unificado")).toBeVisible()
    await expect(page.getByText(/return redirect/).first()).toBeVisible()
    await page.getByRole("button", { name: "Árvore" }).click()
    await expect(page.getByRole("tree")).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("Mais abre terminal, preview e processos sem sair do worktree", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByRole("button", { name: "Mais", exact: true }).click()
    await expect(page.getByRole("heading", { name: "Mais áreas" })).toBeVisible()
    await page.getByRole("button", { name: "Terminal", exact: true }).click()
    await expect(page.getByText("Sem shell conectada.")).toBeVisible()
    await expect(page.getByRole("button", { name: "C", exact: true })).toBeDisabled()
    await page.getByRole("button", { name: "Fechar painel de recursos" }).click()

    await page.getByRole("button", { name: "Mais", exact: true }).click()
    await page.getByRole("button", { name: "Preview", exact: true }).click()
    await expect(page.getByText("O demo não abre URLs.")).toBeVisible()
    await page.getByRole("button", { name: "Fechar painel de recursos" }).click()

    await page.getByRole("button", { name: "Mais", exact: true }).click()
    await page.getByRole("button", { name: "Processos", exact: true }).click()
    await expect(page.getByText("Playwright / job-tests")).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("busca mobile abre o trecho e preserva a consulta", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByRole("button", { name: "Buscar sessões" }).click()
    await page.getByLabel("Termo de busca no histórico").fill("LoginRedirectTest")
    await page.getByRole("button", { name: "Abrir neste trecho" }).first().click()
    await expect(page).toHaveURL(/message=/)
    await page.getByRole("button", { name: "Buscar sessões" }).click()
    await expect(page.getByLabel("Termo de busca no histórico")).toHaveValue("LoginRedirectTest")
    await expectNoHorizontalOverflow(page)
    await expectClean(monitor, testInfo)
  })

  test("login e sessões funcionam em viewport estreita", async ({ page, browser }) => {
    await page.goto("/settings?tab=access")
    await expect(page.getByRole("heading", { name: /Este navegador/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)
    await page.screenshot({ path: "docs/dev/evidencias/m2a-mobile-access.png", fullPage: true })

    const context = await browser.newContext({
      viewport: { width: 360, height: 800 },
      isMobile: true,
      hasTouch: true,
      storageState: { cookies: [], origins: [] },
    })
    const login = await context.newPage()
    await login.goto("http://127.0.0.1:5174/login")
    await expect(login.getByRole("heading", { name: "Entrar" })).toBeVisible()
    const overflow = await login.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(1)
    await login.screenshot({ path: "docs/dev/evidencias/m2a-mobile-login.png", fullPage: true })
    await context.close()
  })
})
