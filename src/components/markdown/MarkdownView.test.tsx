import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vitest"

import { MarkdownView } from "./MarkdownView"

describe("renderização segura de Markdown", () => {
  it("não executa HTML/JS e não carrega imagens externas", () => {
    const { container } = render(
      <MarkdownView
        content={
          '<script>window.__pwned = true</script>\n\n<img src="https://example.invalid/raw.png" alt="x" />\n\n![imagem](https://example.invalid/a.png)\n\n[link externo](https://example.invalid/pagina)\n\n```js\nalert(1)\n```'
        }
      />,
    )
    expect((window as unknown as { __pwned?: boolean }).__pwned).toBeUndefined()
    expect(container.querySelector("script")).toBeNull()
    expect(container.querySelector("img")).toBeNull()
    expect(screen.getByText(/Imagem não carregada/)).toBeInTheDocument()
    expect(screen.getByText("link externo")).toHaveAttribute(
      "title",
      expect.stringContaining("Link externo não aberto"),
    )
    expect(screen.getByText("alert(1)")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Copiar código" })).toBeInTheDocument()
  })
})
