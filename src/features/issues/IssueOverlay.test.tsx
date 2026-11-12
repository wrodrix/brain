import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter } from "react-router-dom"
import { describe, expect, it } from "vitest"

import { DemoProvider, useDemo } from "@/demo/DemoProvider"
import { IssueOverlay } from "./IssueOverlay"

function Harness() {
  const { state, dispatch } = useDemo()
  return (
    <div>
      <button
        type="button"
        onClick={() =>
          dispatch({ type: "OPEN_ISSUE", issueId: "issue-142", triggerLabel: "Teste" })
        }
      >
        Abrir issue
      </button>
      <p data-testid="draft">{state.ui.issueCommentDrafts["issue-142"] ?? ""}</p>
      <p data-testid="sources">{(state.ui.composerSources["sess-impl"] ?? []).length}</p>
      <p data-testid="comments">
        {state.issues.find((issue) => issue.id === "issue-142")?.comments.length}
      </p>
      <IssueOverlay />
    </div>
  )
}

function renderHarness() {
  return render(
    <MemoryRouter>
      <DemoProvider>
        <Harness />
      </DemoProvider>
    </MemoryRouter>,
  )
}

describe("overlay de issues", () => {
  it("preserva rascunho ao fechar/reabrir e devolve o foco ao disparador", async () => {
    const user = userEvent.setup()
    renderHarness()
    const trigger = screen.getByRole("button", { name: "Abrir issue" })
    await user.click(trigger)
    const textarea = await screen.findByLabelText("Novo comentário")
    await user.type(textarea, "Rascunho preservado entre aberturas")
    expect(screen.getByTestId("draft")).toHaveTextContent("Rascunho preservado")

    await user.click(screen.getByRole("button", { name: "Fechar painel de issues" }))
    await waitFor(() => expect(trigger).toHaveFocus())
    expect(screen.getByTestId("draft")).toHaveTextContent("Rascunho preservado")

    await user.click(trigger)
    expect(await screen.findByLabelText("Novo comentário")).toHaveValue(
      "Rascunho preservado entre aberturas",
    )
  })

  it("mencionar no prompt não publica comentário e adiciona fonte ao rascunho", async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole("button", { name: "Abrir issue" }))
    await screen.findByLabelText("Novo comentário")
    expect(screen.getByTestId("sources")).toHaveTextContent("0")
    await user.click(screen.getByRole("button", { name: /Mencionar no prompt/ }))
    expect(screen.getByTestId("sources")).toHaveTextContent("1")
    expect(screen.getByTestId("comments")).toHaveTextContent("3")
  })

  it("publicação local confirma comentário e limpa o rascunho", async () => {
    const user = userEvent.setup()
    renderHarness()
    await user.click(screen.getByRole("button", { name: "Abrir issue" }))
    const textarea = await screen.findByLabelText("Novo comentário")
    await user.type(textarea, "Comentário de teste")
    await user.click(screen.getByRole("button", { name: /Publicar comentário/ }))
    await waitFor(() => expect(screen.getByTestId("comments")).toHaveTextContent("4"))
    expect(screen.getByTestId("draft")).toHaveTextContent("")
  })
})
