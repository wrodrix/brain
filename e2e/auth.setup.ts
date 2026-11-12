import { expect, test } from "@playwright/test"
import { createHash, randomBytes } from "node:crypto"
import { mkdir } from "node:fs/promises"
import { Pool } from "pg"

const WEB_URL = "http://127.0.0.1:5174"
const EMAIL = "e2e@example.test"
const PASSWORD = "senha-e2e-123"

test.describe.configure({ mode: "serial" })

test("primeiro setup real, login e storage state", async ({ page, request }) => {
  const databaseUrl = process.env.TEST_DATABASE_URL
  if (!databaseUrl) throw new Error("TEST_DATABASE_URL ausente")

  const pool = new Pool({ connectionString: databaseUrl })
  const token = randomBytes(32).toString("base64url")
  const tokenHash = createHash("sha256").update(token).digest("hex")
  await pool.query(
    'TRUNCATE TABLE "user", device, session, account, verification, "rateLimit", login_throttle, instance_setup RESTART IDENTITY CASCADE',
  )
  await pool.query(
    `INSERT INTO instance_setup (id, status, token_hash, token_created_at, token_expires_at)
     VALUES (1, 'pending', $1, now(), now() + interval '1 hour')`,
    [tokenHash],
  )
  await pool.end()

  await page.goto("/setup")
  await expect(page.getByRole("heading", { name: "Primeiro acesso" })).toBeVisible()
  await page.screenshot({ path: "docs/dev/evidencias/m2a-setup.png", fullPage: true })

  await page.getByLabel("Token de instalação").fill(token)
  await page.getByLabel("Nome", { exact: true }).fill("Pessoa E2E")
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByLabel("Confirmar senha", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Criar primeiro usuário" }).click()

  await expect(page).toHaveURL(/\/login/)
  await page.screenshot({ path: "docs/dev/evidencias/m2a-login.png", fullPage: true })
  await page.getByLabel("Email", { exact: true }).fill(EMAIL)
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD)
  await page.getByRole("button", { name: "Entrar", exact: true }).click()
  await expect(page).toHaveURL(WEB_URL + "/")

  await mkdir("e2e/.auth", { recursive: true })
  await page.context().storageState({ path: "e2e/.auth/state.json" })
  await page.screenshot({ path: "docs/dev/evidencias/m2a-projects.png", fullPage: true })

  const signup = await request.post(`${WEB_URL}/api/auth/sign-up/email`, {
    headers: { origin: WEB_URL, "content-type": "application/json" },
    data: { name: "X", email: "x@example.test", password: PASSWORD },
  })
  expect(signup.status()).toBe(404)
})
