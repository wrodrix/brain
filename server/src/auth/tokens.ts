import { createHash, randomBytes, timingSafeEqual } from "node:crypto"

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url")
}

export function hashOpaqueToken(token: string): string {
  return createHash("sha256").update(token).digest("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a)
  const right = Buffer.from(b)
  if (left.length !== right.length) return false
  return timingSafeEqual(left, right)
}

export function newId(): string {
  return crypto.randomUUID()
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}
