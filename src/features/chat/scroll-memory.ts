const positions = new Map<string, number>()

/**
 * Ephemeral scroll memory for the demo. It never persists to storage and is
 * scoped by reset count so a scenario reset starts from a clean position.
 */
export function rememberChatScroll(key: string, top: number) {
  positions.set(key, top)
}

export function getChatScroll(key: string): number | undefined {
  return positions.get(key)
}
