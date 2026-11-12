import type { Message } from "@/demo/types"

export interface ChatTurn {
  id: string
  user?: Message
  items: Message[]
}

export function buildChatTurns(messages: Message[]): ChatTurn[] {
  const turns: ChatTurn[] = []
  let current: ChatTurn | null = null
  for (const message of messages) {
    if (message.role === "user") {
      current = { id: message.id, user: message, items: [] }
      turns.push(current)
      continue
    }
    if (!current) {
      current = { id: message.id, items: [] }
      turns.push(current)
    }
    current.items.push(message)
  }
  return turns
}
