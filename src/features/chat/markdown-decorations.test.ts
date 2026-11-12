import { describe, expect, it } from "vitest"

import { collectMarkdownDecorations } from "./markdown-decorations"

function classesFor(text: string, needle: string) {
  const offset = text.indexOf(needle)
  return collectMarkdownDecorations(text)
    .filter((range) => range.from <= offset && range.to >= offset)
    .map((range) => range.className)
}

describe("decoração Markdown ao digitar", () => {
  it("formata listas, citação, título e código inline", () => {
    const text = "# Plano\n\n- item um\n- item dois\n\n> cuidado\n\nUse `redirect()` aqui."
    expect(classesFor(text, "Plano")).toContain("md-live-heading")
    expect(classesFor(text, "- item um")).toContain("md-live-list")
    expect(classesFor(text, "cuidado")).toContain("md-live-quote")
    expect(classesFor(text, "redirect()")).toContain("md-live-inline-code")
  })

  it("formata bloco com linguagem, sem linguagem e bloco ainda aberto", () => {
    const withLanguage = "```php\nreturn redirect();\n```\n"
    const withoutLanguage = "```\nlinha neutra\n```\n"
    const open = "```ts\nconst valor = 1\n"

    const lang = classesFor(withLanguage, "return redirect();")
    expect(lang).toContain("cm-md-code-line")
    expect(classesFor(withLanguage, "```php")).toContain("cm-md-fence-line")

    expect(classesFor(withoutLanguage, "linha neutra")).toContain("cm-md-code-line")
    expect(classesFor(open, "const valor = 1")).toContain("cm-md-code-line")
  })

  it("oculta delimitadores e destaca sintaxe do bloco", () => {
    const text = "Use `redirect()` aqui.\n\n```php\nreturn $target;\n```"
    const decorations = collectMarkdownDecorations(text)
    const hidden = decorations
      .filter((range) => range.kind === "hide")
      .map((range) => text.slice(range.from, range.to))
    expect(hidden.filter((value) => value === "`")).toHaveLength(2)
    expect(hidden.filter((value) => value === "```")).toHaveLength(2)
    expect(classesFor(text, "redirect()")).toContain("md-live-inline-code")
    expect(classesFor(text, "return")).toContain("cm-syn-keyword")
    expect(classesFor(text, "$target")).toContain("cm-syn-variable")
  })

  it("não interpreta markup dentro de bloco de código", () => {
    const text = "```\n- não é lista\n> não é citação\n`não é inline`\n```"
    const classes = classesFor(text, "- não é lista")
    expect(classes).toContain("cm-md-code-line")
    expect(classes).not.toContain("md-live-list")
  })

  it("não altera o texto e mantém offsets dentro dos limites", () => {
    const text = "a\n\n```\nb\n"
    const original = text
    const decorations = collectMarkdownDecorations(text)
    expect(text).toBe(original)
    for (const range of decorations) {
      expect(range.from).toBeGreaterThanOrEqual(0)
      expect(range.to).toBeLessThanOrEqual(text.length)
      expect(range.from).toBeLessThanOrEqual(range.to)
    }
  })

  it("tolera delimitadores abertos sem lançar erro", () => {
    expect(() => collectMarkdownDecorations("texto com `crase aberta")).not.toThrow()
    expect(() => collectMarkdownDecorations("```php\nsem fechamento")).not.toThrow()
    expect(() => collectMarkdownDecorations("**negrito sem fim")).not.toThrow()
  })
})
