/**
 * Decides whether an @/# trigger should open the mention selector.
 * Literal email addresses, fenced code and inline code keep the text literal;
 * a lone trigger character does not steal Markdown headings or prose.
 */
export function shouldOpenMention(text: string, pos: number): boolean {
  const before = text.slice(0, pos)
  const lineStart = before.lastIndexOf("\n") + 1
  const line = before.slice(lineStart)
  const match = /[@#][^@#\s]*$/.exec(line)
  if (!match) return false
  if (match[0].length < 2) return false

  const triggerIndex = lineStart + match.index
  if (triggerIndex > 0 && /[\w.+-]/.test(text[triggerIndex - 1] ?? "")) {
    return false
  }

  const previousLines = text.slice(0, lineStart).split("\n")
  const fenceCount = previousLines.filter((item) => /^\s*```/.test(item)).length
  if (fenceCount % 2 === 1) return false

  const backticksBefore = line.slice(0, match.index).split("`").length - 1
  if (backticksBefore % 2 === 1) return false

  return true
}
