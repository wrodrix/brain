import { closeDb } from "../src/db/client.js"
import { issueSetupToken } from "../src/auth/routes/setup.js"

try {
  const { token, expiresAt } = await issueSetupToken()
  process.stdout.write(`${token}\n`)
  process.stderr.write(
    `Token de instalação válido até ${expiresAt.toISOString()}. ` +
      "Ele não será exibido novamente; guarde-o apenas até concluir o setup.\n",
  )
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  await closeDb()
}
