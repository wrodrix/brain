import { expect, test } from "@playwright/test"

import { expectClean, monitorDemo, openWorktree } from "./helpers"

test.describe("cenários e resiliência", () => {
  test("setup falho bloqueia a sessão e mantém logs inspecionáveis", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("setup-failed")
    await expect(page.getByText("Setup falhou · sessão não liberada como pronta.")).toBeVisible()
    await expect(page.getByText(/Exit code 1/)).toBeVisible()
    const editor = page.getByTestId("composer-editor")
    await expect(editor).toHaveAttribute("contenteditable", "false")
    await page.getByRole("button", { name: "Ver logs e exit code" }).click()
    await expect(page.getByText(/Base table or view not found/)).toBeVisible()
    await page.getByRole("button", { name: "Fechar", exact: true }).first().click()
    await expectClean(monitor, testInfo)
  })

  test("rede instável mantém métricas ausentes e publicação incerta sem duplicar", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    await page.getByLabel("Cenário de demonstração").selectOption("network")

    await page.getByRole("button", { name: /Processos/ }).first().click()
    await expect(page.getByText("Ambiente offline: a última medição é antiga")).toBeVisible()
    await expect(page.getByText("não disponível").first()).toBeVisible()
    await page.getByRole("button", { name: "Fechar painel de recursos" }).click()

    await page.getByRole("button", { name: /Terminal 2/ }).click()
    await expect(page.getByText("PTY encerrado", { exact: true }).first()).toBeVisible()
    await page.getByRole("button", { name: "Fechar painel de recursos" }).click()
    await expect(page.getByText(/Ambiente Linux-A está offline/)).toBeVisible()
    await page.getByRole("button", { name: "Abrir issues" }).click()
    await page.getByLabel("Novo comentário").fill("Comentário com confirmação perdida")
    await page.getByRole("button", { name: /Publicar comentário/ }).click()
    await expect(page.getByText("Resultado incerto: a confirmação não chegou.")).toBeVisible()
    await expect(page.getByLabel("Novo comentário")).toHaveValue(
      "Comentário com confirmação perdida",
    )
    await page.getByRole("button", { name: "Verificar publicação" }).click()
    await expect(page.getByText("Comentário confirmado na fixture local.")).toBeVisible()
    await expect(page.getByText("4/4 carregados")).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("revisão desatualizada e gates indisponíveis bloqueiam o merge", async ({
    page,
  }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page, "review")
    await page.getByLabel("Cenário de demonstração").selectOption("review-stale")
    await expect(page.getByText("Evidência desatualizada", { exact: true })).toBeVisible()
    await expect(page.getByText("1 falha: LoginRedirectTest.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Fazer merge/ })).toBeDisabled()
    await page.getByRole("button", { name: /Revalidar evidência/ }).click()
    await expect(page.getByText("Gates obrigatórios ainda bloqueiam o merge.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Fazer merge/ })).toBeDisabled()

    await page.getByLabel("Cenário de demonstração").selectOption("network")
    await expect(page.getByText("Não foi possível consultar os gates.")).toBeVisible()
    await expect(page.getByRole("button", { name: /Fazer merge/ })).toBeDisabled()
    await expectClean(monitor, testInfo)
  })

  test("reset restaura o cenário e remove mensagens locais", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await openWorktree(page)
    const editor = page.getByTestId("composer-editor")
    await editor.click()
    await page.keyboard.type("Mensagem que será descartada no reset")
    await page.getByRole("button", { name: "Enviar", exact: true }).click()
    await expect(page.getByText("Mensagem que será descartada no reset", { exact: true })).toBeVisible()

    await page.getByRole("button", { name: "Reiniciar cenário" }).click()
    await page.getByRole("button", { name: "Reiniciar cenário" }).last().click()
    await expect(page.getByText("Mensagem que será descartada no reset", { exact: true })).toBeHidden()
    await expect(page.getByText("0/2")).toBeVisible()
    await expectClean(monitor, testInfo)
  })

  test("roteiro guiado navega sem executar integrações", async ({ page }, testInfo) => {
    const monitor = await monitorDemo(page)
    await page.goto("/")
    await page.getByRole("button", { name: "Abrir roteiro guiado" }).first().click()
    await expect(page.getByRole("heading", { name: "Roteiro guiado do M1" })).toBeVisible()
    await expect(page.getByText(/Nada aqui executa operações reais/)).toBeVisible()
    await page.getByRole("button", { name: "Abrir esta etapa" }).first().click()
    await expect(page).toHaveURL("/")
    await expectClean(monitor, testInfo)
  })
})
