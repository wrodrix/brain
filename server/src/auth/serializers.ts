import type {
  DeviceView,
  PublicUser,
  SessionSummary,
  SessionView,
} from "../../../shared/auth.js"
import { truncateLabel } from "./device.js"

interface UserRow {
  id: string
  name: string
  email: string
  emailVerified: boolean
  image?: string | null
}

interface DeviceRow {
  id: string
  label: string
  userAgent: string | null
  trustedUntil: Date | null
  createdAt: Date
  lastSeenAt: Date
}

interface SessionRow {
  id: string
  deviceId: string | null
  trusted: boolean
  createdAt: Date
  expiresAt: Date
  absoluteExpiresAt: Date | null
  lastAuthAt: Date | null
  lastActivityAt: Date | null
  ipAddress: string | null
  userAgent: string | null
}

export function toPublicUser(user: UserRow): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null,
  }
}

export function toDeviceView(row: DeviceRow): DeviceView {
  return {
    id: row.id,
    label: truncateLabel(row.label),
    userAgent: row.userAgent,
    trustedUntil: row.trustedUntil?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    lastSeenAt: row.lastSeenAt.toISOString(),
  }
}

export function toSessionView(row: SessionRow): SessionView {
  if (!row.deviceId || !row.absoluteExpiresAt || !row.lastAuthAt || !row.lastActivityAt) {
    throw new Error("Sessão incompleta")
  }
  return {
    id: row.id,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    absoluteExpiresAt: row.absoluteExpiresAt.toISOString(),
    lastAuthAt: row.lastAuthAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    trusted: row.trusted,
    deviceId: row.deviceId,
    userAgent: row.userAgent,
    ipAddress: row.ipAddress,
  }
}

export function toSessionSummary(
  row: SessionRow,
  deviceRow: DeviceRow | null,
  currentId: string,
): SessionSummary {
  if (!row.absoluteExpiresAt || !row.lastActivityAt) {
    throw new Error("Sessão incompleta")
  }
  return {
    id: row.id,
    current: row.id === currentId,
    trusted: row.trusted,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    absoluteExpiresAt: row.absoluteExpiresAt.toISOString(),
    lastActivityAt: row.lastActivityAt.toISOString(),
    device: deviceRow ? toDeviceView(deviceRow) : null,
  }
}
