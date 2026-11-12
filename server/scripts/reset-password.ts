import { and, eq } from "drizzle-orm"

import { auth } from "../src/auth/auth.js"
import { newId, normalizeEmail } from "../src/auth/tokens.js"
import { closeDb, db } from "../src/db/client.js"
import { account, device, session, user } from "../src/db/schema/index.js"

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString("utf8").trimEnd()
}

async function readSecret(prompt: string): Promise<string> {
  if (!process.stdin.isTTY) {
    throw new Error("Sem TTY. Use --password-stdin para automação controlada.")
  }
  process.stderr.write(prompt)
  process.stdin.setRawMode(true)
  process.stdin.resume()
  process.stdin.setEncoding("utf8")
  return new Promise<string>((resolve, reject) => {
    let value = ""
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\u0003") {
          cleanup()
          reject(new Error("Cancelado."))
          return
        }
        if (char === "\r" || char === "\n") {
          cleanup()
          process.stderr.write("\n")
          resolve(value)
          return
        }
        if (char === "\u007f" || char === "\b") {
          value = value.slice(0, -1)
          continue
        }
        value += char
      }
    }
    const cleanup = () => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.off("data", onData)
    }
    process.stdin.on("data", onData)
  })
}

async function main(): Promise<void> {
  const email = argument("--email")
  if (!email) throw new Error("Uso: npm run auth:reset-password -- --email <email>")
  const useStdin = process.argv.includes("--password-stdin")
  const password = useStdin ? await readStdin() : await readSecret("Nova senha: ")
  const confirmation = useStdin ? password : await readSecret("Confirme a nova senha: ")
  if (password.length < 8) throw new Error("A senha precisa ter pelo menos 8 caracteres.")
  if (password !== confirmation) throw new Error("As senhas não coincidem.")

  const normalized = normalizeEmail(email)
  const [target] = await db.select().from(user).where(eq(user.email, normalized)).limit(1)
  if (!target) throw new Error("Usuário não encontrado.")

  const context = await auth.$context
  const passwordHash = await context.password.hash(password)
  const now = new Date()

  await db.transaction(async (tx) => {
    const [credential] = await tx
      .select()
      .from(account)
      .where(and(eq(account.userId, target.id), eq(account.providerId, "credential")))
      .limit(1)
    if (!credential) {
      await tx.insert(account).values({
        id: newId(),
        accountId: target.id,
        providerId: "credential",
        userId: target.id,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      })
    } else {
      await tx
        .update(account)
        .set({ password: passwordHash, updatedAt: now })
        .where(eq(account.id, credential.id))
    }
    await tx.delete(session).where(eq(session.userId, target.id))
    await tx
      .update(device)
      .set({ revokedAt: now, trustedUntil: null })
      .where(eq(device.userId, target.id))
  })

  process.stderr.write(`Senha atualizada para ${target.email}; sessões e confianças revogadas.\n`)
}

main()
  .catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
  .finally(async () => {
    await closeDb()
  })
