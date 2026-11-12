import type { FastifyReply } from "fastify"
import { and, eq } from "drizzle-orm"

import { AUTH_LIMITS } from "../../../shared/auth.js"
import { db } from "../db/client.js"
import { device } from "../db/schema/index.js"
import { createOpaqueToken, hashOpaqueToken, newId, safeEqual } from "./tokens.js"

export const DEVICE_COOKIE = "brain_device"

export interface ResolvedDevice {
  id: string
  token: string
  isNew: boolean
}

export function deviceLabelFromUserAgent(userAgent: string | undefined): string {
  if (!userAgent) return "Navegador não identificado"
  const browser = /Edg\//i.test(userAgent)
    ? "Edge"
    : /Firefox\//i.test(userAgent)
      ? "Firefox"
      : /Chrome\//i.test(userAgent)
        ? "Chrome"
        : /Safari\//i.test(userAgent)
          ? "Safari"
          : "Navegador"
  const os = /Mac OS X|Macintosh/i.test(userAgent)
    ? "macOS"
    : /Windows/i.test(userAgent)
      ? "Windows"
      : /Android/i.test(userAgent)
        ? "Android"
        : /iPhone|iPad|iOS/i.test(userAgent)
          ? "iOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "SO não identificado"
  return `${browser} · ${os}`
}

export async function resolveLoginDevice(options: {
  userId: string
  existingToken: string | undefined
  userAgent: string | undefined
  now: Date
}): Promise<ResolvedDevice> {
  const { userId, existingToken, userAgent, now } = options
  if (existingToken) {
    const tokenHash = hashOpaqueToken(existingToken)
    const [existing] = await db
      .select()
      .from(device)
      .where(and(eq(device.tokenHash, tokenHash), eq(device.userId, userId)))
      .limit(1)
    if (existing && !existing.revokedAt) {
      await db
        .update(device)
        .set({ lastSeenAt: now, userAgent: userAgent?.slice(0, 512) ?? existing.userAgent })
        .where(eq(device.id, existing.id))
      return { id: existing.id, token: existingToken, isNew: false }
    }
  }

  const token = createOpaqueToken()
  const tokenHash = hashOpaqueToken(token)
  const [created] = await db
    .insert(device)
    .values({
      id: newId(),
      userId,
      label: deviceLabelFromUserAgent(userAgent),
      userAgent: userAgent?.slice(0, 512) ?? null,
      tokenHash,
      createdAt: now,
      lastSeenAt: now,
    })
    .returning({ id: device.id })
  if (!created) throw new Error("Falha ao criar dispositivo")
  return { id: created.id, token, isNew: true }
}

export function setDeviceCookie(reply: FastifyReply, token: string, secure: boolean): void {
  reply.setCookie(DEVICE_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: Math.floor(AUTH_LIMITS.trustValidityMs / 1000),
  })
}

export function clearDeviceCookie(reply: FastifyReply, secure: boolean): void {
  reply.setCookie(DEVICE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 0,
  })
}

export function deviceTokenMatches(token: string, tokenHash: string): boolean {
  return safeEqual(hashOpaqueToken(token), tokenHash)
}

export function truncateLabel(value: string): string {
  return value.length > 80 ? `${value.slice(0, 77)}...` : value
}
