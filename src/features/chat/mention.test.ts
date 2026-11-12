import { describe, expect, it } from "vitest"

import { shouldOpenMention } from "./mention"

describe("ativação de menções", () => {
  it("abre para @arquivo e #issue com termo digitado", () => {
    expect(shouldOpenMention("veja @Log", "veja @Log".length)).toBe(true)
    expect(shouldOpenMention("veja #142", "veja #142".length)).toBe(true)
  })

  it("não abre com gatilho isolado nem em título Markdown", () => {
    expect(shouldOpenMention("@", 1)).toBe(false)
    expect(shouldOpenMention("# Plano", 8)).toBe(false)
  })

  it("não invade e-mail, código inline ou bloco de código", () => {
    const email = "fale com pessoa@exemplo.com"
    expect(shouldOpenMention(email, email.length)).toBe(false)
    expect(shouldOpenMention("use `@Log`", 9)).toBe(false)
    expect(shouldOpenMention("```\n@Log\n```\n", 9)).toBe(false)
  })

  it("volta a abrir depois do bloco de código", () => {
    const text = "```\ncodigo\n```\n\n@Log"
    expect(shouldOpenMention(text, text.length)).toBe(true)
  })
})
