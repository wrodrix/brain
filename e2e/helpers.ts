import { expect, type Page, type TestInfo } from "@playwright/test"

export interface DemoMonitor {
  errors: string[]
  externalRequests: string[]
}

/**
 * Fails the demo if the page reaches a non-local origin or surfaces an uncaught
 * error. Vite HMR and local assets remain allowed.
 */
export async function monitorDemo(page: Page): Promise<DemoMonitor> {
  const errors: string[] = []
  const externalRequests: string[] = []

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`)
  })
  page.on("console", (message) => {
    if (message.type() === "error") {
      const text = message.text()
      if (!text.includes("favicon")) errors.push(`console: ${text}`)
    }
  })
  await page.route("**/*", async (route) => {
    const url = route.request().url()
    if (!url.startsWith("http")) return route.continue()
    const parsed = new URL(url)
    if (parsed.hostname !== "127.0.0.1" && parsed.hostname !== "localhost") {
      externalRequests.push(url)
      return route.abort()
    }
    return route.continue()
  })

  return { errors, externalRequests }
}

export async function expectClean(monitor: DemoMonitor, testInfo: TestInfo) {
  if (monitor.externalRequests.length > 0) {
    testInfo.attach("external-requests", {
      body: monitor.externalRequests.join("\n"),
      contentType: "text/plain",
    })
  }
  expect(monitor.externalRequests, "nenhuma requisição externa deve ocorrer").toEqual([])
  expect(monitor.errors, "console sem erros não tratados").toEqual([])
}

export async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const width = document.documentElement.scrollWidth
    return Math.max(0, width - window.innerWidth)
  })
  expect(overflow, "sem rolagem horizontal na viewport estreita").toBeLessThanOrEqual(1)
}

export async function openWorktree(page: Page, view = "chat") {
  await page.goto(`/projects/atlas/worktrees/wt-login?view=${view}`)
  await expect(page.getByText("Demonstração — dados fictícios, sem execução real")).toBeVisible()
  await expect(page.getByRole("heading", { name: "issue-142-login" })).toBeVisible()
}
