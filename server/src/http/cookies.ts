function serializeCookie(
  name: string,
  value: string,
  options: { secure: boolean; maxAge: number },
): string {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    `Max-Age=${options.maxAge}`,
    "HttpOnly",
    "SameSite=Lax",
  ]
  if (options.secure) parts.push("Secure")
  return parts.join("; ")
}

export function sessionCookieName(): string {
  return "brain.session_token"
}

export function buildDeviceCookie(token: string, secure: boolean, maxAgeSeconds: number): string {
  return serializeCookie("brain_device", token, { secure, maxAge: maxAgeSeconds })
}

export function expiredDeviceCookie(secure: boolean): string {
  return serializeCookie("brain_device", "", { secure, maxAge: 0 })
}

export function expiredSessionCookie(secure: boolean): string {
  return serializeCookie(sessionCookieName(), "", { secure, maxAge: 0 })
}
