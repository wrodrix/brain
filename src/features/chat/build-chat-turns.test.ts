import { describe, expect, it } from "vitest"

import { createInitialState } from "@/demo/fixtures"
import type { Message } from "@/demo/types"
import { buildChatTurns } from "./build-chat-turns"

function message(
  id: string,
  role: Message["role"],
  extra: Partial<Message> = {},
): Message {
  return {
    id,
    sessionId: "sess-impl",
    role,
    content: id,
    createdAt: "2026-11-11T12:00:00.000Z",
    ...extra,
  }
}

describe("agrupamento de turnos do chat", () => {
  it("associa ferramentas e resposta ao prompt que as iniciou", () => {
    const turns = buildChatTurns([
      message("user-a", "user"),
      message("tool-a", "tool", { tool: { id: "t", name: "shell", args: "{}", argsComplete: true, state: "succeeded", scope: "x", startedAt: "2026-11-11T12:00:00.000Z" } }),
      message("assistant-a", "assistant"),
      message("user-b", "user"),
      message("tool-b", "tool"),
      message("assistant-b", "assistant"),
    ])
    expect(turns).toHaveLength(2)
    expect(turns[0].user?.id).toBe("user-a")
    expect(turns[0].items.map((item) => item.id)).toEqual(["tool-a", "assistant-a"])
    expect(turns[1].user?.id).toBe("user-b")
    expect(turns[1].items.map((item) => item.id)).toEqual(["tool-b", "assistant-b"])
  })

  it("não mistura mensagem enfileirada com a atividade do turno anterior", () => {
    const state = createInitialState("during-run")
    const session = state.sessions.find((item) => item.id === "sess-impl")!
    const turns = buildChatTurns(session.messages)
    const queued = turns.find((turn) => turn.user?.id === "msg-queued-continuation")
    expect(queued).toBeDefined()
    expect(queued?.items).toHaveLength(0)
    expect(turns.at(-1)?.id).toBe("msg-queued-continuation")
  })

  it("mantém eventos e atividade dentro do turno, em ordem", () => {
    const turns = buildChatTurns([
      message("user-a", "user"),
      message("event-a", "event"),
      message("tool-a", "tool"),
      message("assistant-a", "assistant"),
    ])
    expect(turns[0].items.map((item) => item.role)).toEqual(["event", "tool", "assistant"])
  })
})
