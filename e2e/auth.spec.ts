import { expect, test } from "@playwright/test"

const BASE = "http://127.0.0.1:5174"
const EMAIL = "e2e@example.test"
const PASSWORD = "senha-e2e-123"

test.describe.configure({ mode: "serial" })

test("login é obrigatório e a página inicial não expõe a demonstração sem sessão", async ({
  browser,
}) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await page.goto(`${BASE}/`)
  await expect(page).toHaveURL(/\/login/)
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible()
  await expect(page.getByLabel("Email", { exact: true })).toBeVisible()
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada")
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page.getByRole("alert")).toContainText("incorretos")
  await context.close()
})

test("signup direto continua fechado", async ({ request }) => {
  const response = await request.post("/api/auth/sign-up/email", {
    headers: { origin: BASE, "content-type": "application/json" },
    data: { name: "Intruso", email: "intruso@example.test", password: PASSWORD },
  })
  expect(response.status()).toBe(404)
})

test("sessão curta pode ser promovida a confiável de forma explícita", async ({ page }) => {
  await page.goto("/settings?tab=access")
  await expect(page.getByText("não confiável").first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Confiar neste dispositivo" })).toBeVisible()
  await page.screenshot({ path: "docs/dev/evidencias/m2a-settings-access.png", fullPage: true })

  await page.getByRole("button", { name: "Confiar neste dispositivo" }).click()
  await expect(page.getByText("confiável").first()).toBeVisible()
  await expect(page.getByRole("button", { name: "Revogar confiança deste navegador" })).toBeVisible()
  await page.screenshot({ path: "docs/dev/evidencias/m2a-settings-trusted.png", fullPage: true })
})

test("outra sessão aparece na lista e pode ser revogada", async ({ page, browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const other = await context.newPage()
  await other.goto(`${BASE}/login`)
  await other.getByLabel("Email", { exact: true }).fill(EMAIL)
  await other.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await other.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(other).toHaveURL(BASE + "/")

  await page.goto("/settings?tab=access")
  await expect(page.getByText("esta sessão")).toBeVisible()
  await expect(page.getByRole("button", { name: "Revogar", exact: true })).toHaveCount(1)

  await page.getByRole("button", { name: "Revogar", exact: true }).click()
  await page.getByRole("dialog").getByRole("button", { name: "Revogar", exact: true }).click()
  await expect(page.getByText("Sessão revogada.")).toBeVisible()

  await other.reload()
  await expect(other).toHaveURL(/\/login/)
  await context.close()
})

test("logout encerra a sessão neste navegador", async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } })
  const page = await context.newPage()
  await page.goto(`${BASE}/login`)
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL(BASE + "/")

  await page.getByRole("button", { name: /Menu da conta de/ }).click()
  await page.getByRole("menuitem", { name: "Sair" }).click()
  await expect(page).toHaveURL(/\/login/)
  await context.close()
})
