export interface MarkdownDecorationRange {
  from: number
  to: number
  kind: "line" | "mark" | "hide"
  className: string
}

type CodeTokenPattern = {
  regex: RegExp
  className: string
}

const commonTokens: CodeTokenPattern[] = [
  { regex: /"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g, className: "cm-syn-string" },
  { regex: /\b\d+(?:\.\d+)?\b/g, className: "cm-syn-number" },
  { regex: /\b(?:true|false|null|undefined)\b/g, className: "cm-syn-keyword" },
]

const scriptTokens: CodeTokenPattern[] = [
  { regex: /\/\/.*$|\/\*.*?\*\//g, className: "cm-syn-comment" },
  { regex: /`(?:\\.|[^`\\])*`/g, className: "cm-syn-string" },
  {
    regex:
      /\b(?:function|return|if|else|elseif|foreach|for|while|class|new|echo|public|private|protected|static|const|let|var|import|export|from|async|await|namespace|use|extends|implements|match|switch|case|break|continue|default|try|catch|finally|throw|interface|type|enum|fn|in|of|as|instanceof|typeof|void|yield)\b/g,
    className: "cm-syn-keyword",
  },
  { regex: /\$[A-Za-z_]\w*/g, className: "cm-syn-variable" },
  { regex: /\b[A-Za-z_]\w*(?=\s*\()/g, className: "cm-syn-function" },
]

function codePatterns(language: string): CodeTokenPattern[] {
  if (!language) return commonTokens
  if (language === "json") return commonTokens
  if (["ts", "tsx", "js", "jsx", "javascript", "typescript"].includes(language)) {
    return [...scriptTokens, ...commonTokens]
  }
  if (["php", "bash", "sh", "shell", "sql", "python", "py"].includes(language)) {
    return [...scriptTokens, ...commonTokens]
  }
  return commonTokens
}

function collectCodeTokens(
  line: string,
  lineFrom: number,
  language: string,
): MarkdownDecorationRange[] {
  const ranges: MarkdownDecorationRange[] = []
  const occupied: Array<{ from: number; to: number }> = []
  const overlaps = (from: number, to: number) =>
    occupied.some((range) => from < range.to && to > range.from)

  for (const pattern of codePatterns(language)) {
    pattern.regex.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.regex.exec(line)) !== null) {
      if (match[0].length === 0) continue
      const from = lineFrom + match.index
      const to = from + match[0].length
      if (overlaps(from, to)) continue
      occupied.push({ from, to })
      ranges.push({ from, to, kind: "mark", className: pattern.className })
    }
  }
  return ranges
}

/**
 * Pure markdown decoration classifier used by the composer and by unit tests.
 * It never rewrites the document: ranges only add visual classes or hide a
 * delimiter, so caret, selection, undo history and pasted text remain native
 * CodeMirror behavior.
 */
export function collectMarkdownDecorations(text: string): MarkdownDecorationRange[] {
  const ranges: MarkdownDecorationRange[] = []
  const lines = text.split("\n")
  let offset = 0
  let inFence = false
  let fenceLanguage = ""

  for (const rawLine of lines) {
    const lineFrom = offset
    const lineTo = offset + rawLine.length
    const line = rawLine

    const fenceMatch = /^(\s*)```([\w-]*)\s*$/.exec(line)
    if (fenceMatch) {
      const fenceFrom = lineFrom + fenceMatch[1].length
      ranges.push({
        from: lineFrom,
        to: lineFrom,
        kind: "line",
        className: inFence ? "cm-md-fence-line cm-md-fence-close" : "cm-md-fence-line",
      })
      ranges.push({ from: fenceFrom, to: fenceFrom + 3, kind: "hide", className: "" })
      if (!inFence) {
        if (fenceMatch[2] && fenceFrom + 3 < lineTo) {
          ranges.push({
            from: fenceFrom + 3,
            to: lineTo,
            kind: "mark",
            className: "md-live-fence",
          })
        }
        inFence = true
        fenceLanguage = fenceMatch[2] ?? ""
      } else {
        inFence = false
        fenceLanguage = ""
      }
      offset = lineTo + 1
      continue
    }

    if (inFence) {
      ranges.push({
        from: lineFrom,
        to: lineFrom,
        kind: "line",
        className: "cm-md-code-line",
      })
      ranges.push(...collectCodeTokens(line, lineFrom, fenceLanguage))
      offset = lineTo + 1
      continue
    }

    const heading = /^(#{1,3})\s+/.exec(line)
    if (heading) {
      const level = heading[1].length
      const prefixEnd = lineFrom + heading[0].length
      ranges.push({
        from: lineFrom,
        to: lineFrom,
        kind: "line",
        className: `cm-md-heading-${level}`,
      })
      ranges.push({ from: lineFrom, to: prefixEnd, kind: "hide", className: "" })
      if (prefixEnd < lineTo) {
        ranges.push({
          from: prefixEnd,
          to: lineTo,
          kind: "mark",
          className: "md-live-heading",
        })
      }
    }

    const quote = /^(\s*>\s?)/.exec(line)
    if (quote) {
      const prefixEnd = lineFrom + quote[0].length
      ranges.push({
        from: lineFrom,
        to: lineFrom,
        kind: "line",
        className: "cm-md-quote-line",
      })
      ranges.push({ from: lineFrom, to: prefixEnd, kind: "hide", className: "" })
      if (prefixEnd < lineTo) {
        ranges.push({
          from: prefixEnd,
          to: lineTo,
          kind: "mark",
          className: "md-live-quote",
        })
      }
    }

    const list = /^(\s*)([-*+]|\d+\.)(\s)/.exec(line)
    if (list) {
      const markerFrom = lineFrom + list[1].length
      ranges.push({
        from: lineFrom,
        to: lineFrom,
        kind: "line",
        className: "cm-md-list-line",
      })
      ranges.push({
        from: markerFrom,
        to: markerFrom + list[2].length,
        kind: "mark",
        className: "md-live-list",
      })
    }

    const occupied: Array<{ from: number; to: number }> = []
    const overlaps = (from: number, to: number) =>
      occupied.some((range) => from < range.to && to > range.from)

    const strong = /\*\*([^*\n]+)\*\*/g
    let match: RegExpExecArray | null
    while ((match = strong.exec(line)) !== null) {
      const from = lineFrom + match.index
      const to = from + match[0].length
      ranges.push({ from, to: from + 2, kind: "hide", className: "" })
      ranges.push({ from: to - 2, to, kind: "hide", className: "" })
      ranges.push({ from: from + 2, to: to - 2, kind: "mark", className: "md-live-strong" })
      occupied.push({ from, to })
    }

    const inlineCode = /`([^`\n]+)`/g
    while ((match = inlineCode.exec(line)) !== null) {
      const from = lineFrom + match.index
      const to = from + match[0].length
      if (overlaps(from, to)) continue
      ranges.push({ from, to: from + 1, kind: "hide", className: "" })
      ranges.push({ from: to - 1, to, kind: "hide", className: "" })
      ranges.push({ from: from + 1, to: to - 1, kind: "mark", className: "md-live-inline-code" })
      occupied.push({ from, to })
    }

    const em = /(^|[\s(])\*([^*\n]+)\*/g
    while ((match = em.exec(line)) !== null) {
      const leading = match[1]?.length ?? 0
      const from = lineFrom + match.index + leading
      const to = from + match[0].length - leading
      if (overlaps(from, to)) continue
      ranges.push({ from, to: from + 1, kind: "hide", className: "" })
      ranges.push({ from: to - 1, to, kind: "hide", className: "" })
      ranges.push({ from: from + 1, to: to - 1, kind: "mark", className: "md-live-em" })
      occupied.push({ from, to })
    }

    const link = /\[[^\]\n]+\]\([^)\n]+\)/g
    while ((match = link.exec(line)) !== null) {
      const from = lineFrom + match.index
      const to = from + match[0].length
      if (overlaps(from, to)) continue
      ranges.push({ from, to, kind: "mark", className: "md-live-link" })
      occupied.push({ from, to })
    }

    offset = lineTo + 1
  }

  return ranges
}
