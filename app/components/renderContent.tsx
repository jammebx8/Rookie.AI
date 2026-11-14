/**
 * renderContent
 * ─────────────
 * Renders question / solution text that may contain any combination of:
 *
 *   • LaTeX:           $inline$  or  $$block$$
 *                      \(...\)   or  \[...\]      (normalised → $ delimiters)
 *                      bare LaTeX lines like  \mathrm{...}=...  (auto-wrapped)
 *   • Markdown tables: | H1 | H2 | … rows   (cells may hold run-together lists)
 *   • Statement lists: (A) text (B) text  — run together without newlines
 *   • Dimension formulas: [ML −1 T −2]  →  [M L⁻¹ T⁻²] (KaTeX)
 *   • Bold:            **text**
 *   • Newlines:        \n  →  <br />
 *
 * Call this instead of the old bare `renderLatex` everywhere.
 */

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'

// ── Shared helpers ────────────────────────────────────────────────────────────

const isTableLine = (l: string) => /^\s*\|/.test(l)

// ── LaTeX delimiter normalisation ─────────────────────────────────────────────

// Tokens that strongly indicate a line is raw LaTeX math, not prose
const LATEX_CMD_RE =
  /\\[a-zA-Z]+\{|\\[a-zA-Z]+\s|\\[,;!]|\\Rightarrow|\\rightarrow|\\Leftarrow|\\leftarrow|\\ldots|\\cdots|\\times|\\div|\\pm|\\mp|\\geq|\\leq|\\neq|\\approx|\\propto|\\infty|\\alpha|\\beta|\\gamma|\\theta|\\mu|\\pi|\\sigma|\\omega/

function isBareLaTeXLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false

  // Already has $ delimiters — leave alone
  if (/\$/.test(t)) return false

  // Contains LaTeX commands
  if (LATEX_CMD_RE.test(t)) return true

  // Lines that are ONLY math-like tokens: =, ^, _, {, }, \
  if (/^[=+\-*/^_{}\\\s\d().[\],]+$/.test(t) && /[\\^_{}]/.test(t)) return true

  return false
}

function normaliseDelimiters(text: string): string {
  // Pass 1 — explicit bracket-style delimiters
  //   \[ ... \]  →  $$...$$   (display)
  //   \( ... \)  →  $...$     (inline)
  let out = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner: string) => `$$${inner.trim()}$$`)
  out = out.replace(/\\\(([\s\S]+?)\\\)/g, (_m, inner: string) => `$${inner.trim()}$`)

  // Pass 2 — wrap bare LaTeX lines (from DB solutions).
  // Never touch table rows: a cell containing \alpha must not wrap the whole row.
  const result: string[] = []
  for (const line of out.split('\n')) {
    if (!isTableLine(line) && isBareLaTeXLine(line)) {
      result.push(`$$${line.trim()}$$`)
    } else {
      result.push(line)
    }
  }
  return result.join('\n')
}

// ── Dimension formulas ────────────────────────────────────────────────────────
// "[ML −1 T −2 ]"  →  "$[\mathrm{M L^{-1} T^{-2}}]$"

const DIM_BRACKET_RE = /\[\s*((?:[MLTAK]+\s*[−–-]?\s*\d*\s*)+)\]/g

function fixDimensionFormulas(text: string): string {
  return text.replace(DIM_BRACKET_RE, (m, inner: string) => {
    if (!/\d/.test(inner)) return m // plain [M], [LT] → leave alone
    const tex = inner.replace(
      /([MLTAK]+)\s*([−–-]?\s*\d+)?/g,
      (_x, letters: string, exp?: string) => {
        const chars = letters.split('')
        const last = chars.pop() as string
        const e = exp ? exp.replace(/[−–]/g, '-').replace(/\s+/g, '') : ''
        return [...chars, e ? `${last}^{${e}}` : last].join(' ') + ' '
      },
    )
    return `$[\\mathrm{${tex.trim()}}]$`
  })
}

// ── PDF-extraction duplicate cleanup (text segments only) ─────────────────────
/**
 * Remove artifacts where a symbol appears twice in a row —
 * e.g. "(M)(M)", "F=maF=ma", "mgsinθmgsinθ".
 * Pure numbers / dashes ("100100", "------") are left untouched.
 */
function removeDuplicateSymbols(text: string): string {
  // (X)(X) → (X)
  let out = text.replace(/(\([^)]{1,40}\))\1/g, '$1')

  // run duplicated: only collapse if the segment isn't purely digits/dots/dashes
  out = out.replace(/([A-Za-zα-ωΑ-Ω=+\-^_\d]{3,40})\1/g, (m, g1: string) =>
    /^[\d.\-]+$/.test(g1) ? m : g1,
  )
  return out
}

// ── Statement lists (text segments only) ──────────────────────────────────────
/**
 * Insert a newline before each statement marker so
 * `(A) foo (B) bar` becomes `(A) foo\n(B) bar`.
 */
function normaliseStatements(text: string): string {
  return text.replace(
    /(?<!\n)\s*\(([A-Z]{1,3}|[a-z]{1,3}|[0-9]{1,2})\)\s+/g,
    (match, group: string, offset: number) => {
      if (offset === 0) return match
      return `\n(${group}) `
    },
  )
}

// ── Table cell list splitting ─────────────────────────────────────────────────
// "A. foo B. bar"  →  "A. foo\nB. bar"   (also (A), I., II., IV., 1., i) …)
// Tighten [A-Z] to [A-E] if prose cells get split by mistake.
const CELL_MARKER_RE =
  /(^|\s+)(\(?(?:[IVX]{2,4}|[A-Z]|[ivx]{1,4})[.)]|\d{1,2}[.)])\s+/g

function splitCellItems(cell: string): string {
  const hits = cell.match(CELL_MARKER_RE)
  if (!hits || hits.length < 2) return cell // need 2+ markers to count as a list
  return cell.replace(
    CELL_MARKER_RE,
    (_m, _lead: string, marker: string, offset: number) =>
      `${offset === 0 ? '' : '\n'}${marker} `,
  )
}

// ── Repair tables whose newlines were lost in the DB ─────────────────────────
// Handles two shapes seen in the data:
//   1. Whole table on ONE line:  "Match List. |H1 |H2 | | || --- | --- | --- | --- || A. | x | I. | y || B. | …"
//   2. Header + separator fine, body rows glued with "||" and/or stray newlines:
//        | (A) foo |\n(I) bar ||(B) baz |\n(II) qux |
// Row boundaries are unreliable, so the body is flattened to a cell stream and
// re-chunked into rows using the column count taken from the separator row.

/** Indexes of `|` that are outside $...$ math and not escaped. */
function pipePositions(s: string): number[] {
  const pos: number[] = []
  let inMath = false
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (ch === '\\') { i++; continue }
    if (ch === '$') inMath = !inMath
    else if (ch === '|' && !inMath) pos.push(i)
  }
  return pos
}

/** Cells between consecutive pipes. Zero-width gaps ("||") are row-boundary artifacts and skipped. */
function cellsBetweenPipes(s: string): string[] {
  const p = pipePositions(s)
  const out: string[] = []
  for (let k = 0; k < p.length - 1; k++) {
    const raw = s.slice(p[k] + 1, p[k + 1])
    if (raw === '') continue
    out.push(raw.trim())
  }
  return out
}

const SEP_RE = /\|\s*:?-{3,}:?\s*(?:\|\s*:?-{3,}:?\s*)+\|/

function hasAdjacentPipes(s: string): boolean {
  const p = pipePositions(s)
  return p.some((x, i) => i > 0 && x === p[i - 1] + 1)
}

function repairBrokenTables(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const m = pipePositions(line).length >= 2 ? SEP_RE.exec(line) : null
    if (!m) { out.push(line); i++; continue }

    const head = line.slice(0, m.index)
    const afterSep = line.slice(m.index + m[0].length)
    const prevHeader =
      !head.trim() && out.length && isTableLine(out[out.length - 1]) ? out[out.length - 1] : ''

    // body = rest of this line + following lines that still contain pipes
    const bodyLines: string[] = afterSep.trim() ? [afterSep] : []
    let j = i + 1
    while (j < lines.length && pipePositions(lines[j]).length > 0) {
      bodyLines.push(lines[j])
      j++
    }

    const broken =
      (head.trim() !== '' && !head.trim().startsWith('|')) ||            // prose glued before header
      afterSep.trim() !== '' ||                                           // body on the separator line
      hasAdjacentPipes(head) ||
      bodyLines.some(l => !l.trim().startsWith('|') || hasAdjacentPipes(l))

    if (!broken) { out.push(line); i++; continue }

    // header cells (+ optional prose before the first pipe)
    let prose = ''
    let headerCells: string[] = []
    if (prevHeader) {
      headerCells = cellsBetweenPipes(prevHeader)
    } else {
      const hp = pipePositions(head)
      if (hp.length) {
        prose = head.slice(0, hp[0]).trim()
        headerCells = cellsBetweenPipes(head.slice(hp[0]))
      }
    }
    // join body lines (no space if a pipe already sits at the seam)
    let bodyText = ''
    bodyLines.forEach((l, k) => {
      if (k === 0) { bodyText = l; return }
      const seamPipe = bodyText.trimEnd().endsWith('|') || l.trimStart().startsWith('|')
      bodyText += (seamPipe ? '' : ' ') + l.trim()
    })
    let cells = cellsBetweenPipes(bodyText)
    const lastPipe = pipePositions(bodyText).pop()
    const tail = lastPipe === undefined ? '' : bodyText.slice(lastPipe + 1).trim()

    if (!headerCells.length || !cells.length) { out.push(line); i++; continue }

    let n = cellsBetweenPipes(m[0]).length
    let hdr = headerCells

    // "| A. | Meter | I. | √ |" under a header with two empty trailing cells
    // → really 2 columns, each made of 2 cells
    if (n === 4 && hdr.length === 4 && !hdr[2] && !hdr[3]) {
      hdr = [hdr[0], hdr[1]]
      const merged: string[] = []
      for (let k = 0; k < cells.length; k += 2) {
        merged.push(`${cells[k]} ${cells[k + 1] ?? ''}`.trim())
      }
      cells = merged
      n = 2
    }
    while (hdr.length < n) hdr.push('')
    hdr = hdr.slice(0, n)

    const fmt = (c: string[]) => `| ${c.join(' | ')} |`
    if (prose) out.push(prose)
    out.push(fmt(hdr))
    out.push(fmt(Array(n).fill('---')))
    for (let k = 0; k < cells.length; k += n) {
      const row = cells.slice(k, k + n)
      while (row.length < n) row.push('')
      out.push(fmt(row))
    }
    if (tail) out.push(tail)
    i = j
  }

  return out.join('\n')
}

// ── Inline rendering ──────────────────────────────────────────────────────────

/** Render a single segment that contains no tables. Handles LaTeX + bold + newlines. */
function renderInlineSegment(text: string, baseKey: string): React.ReactNode {
  if (!text) return null

  // Split on LaTeX first so we never try to parse $...$ inside table cells.
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\n]+?\$)/)

  return parts.map((part, i) => {
    const key = `${baseKey}-${i}`

    if (part.length > 4 && part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={key} math={part.slice(2, -2)} />
    }
    if (part.length > 2 && part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={key} math={part.slice(1, -1)} />
    }

    // Bold (**text**) + newlines inside plain text segments
    const boldParts = part.split(/(\*\*[^*]+\*\*)/)
    const nodes: React.ReactNode[] = []

    boldParts.forEach((bp, bi) => {
      if (bp.startsWith('**') && bp.endsWith('**') && bp.length > 4) {
        nodes.push(<strong key={`${key}-b${bi}`}>{bp.slice(2, -2)}</strong>)
        return
      }
      // split on newlines → insert <br />
      bp.split('\n').forEach((line, li) => {
        if (li > 0) nodes.push(<br key={`${key}-b${bi}-br${li}`} />)
        if (line) nodes.push(<React.Fragment key={`${key}-b${bi}-l${li}`}>{line}</React.Fragment>)
      })
    })

    return <React.Fragment key={key}>{nodes}</React.Fragment>
  })
}

// ── Markdown tables ───────────────────────────────────────────────────────────

/** Parse a markdown table string into headers + rows. */
function parseMarkdownTable(raw: string): { headers: string[]; rows: string[][] } | null {
  const lines = raw
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && l.endsWith('|'))

  if (lines.length < 2) return null

  const parseCells = (line: string) =>
    line
      .slice(1, -1) // strip leading/trailing |
      .split('|')
      .map(c => c.trim())

  const headers = parseCells(lines[0])

  // separator row (---|---) — skip it
  const separatorIdx = lines.findIndex((l, i) => i > 0 && /^\|[\s|:-]+\|$/.test(l))
  const dataStart = separatorIdx >= 0 ? separatorIdx + 1 : 1

  const rows = lines.slice(dataStart).map(parseCells)
  return { headers, rows }
}

/** Render a parsed markdown table as a styled <table>. */
function MarkdownTable({
  headers,
  rows,
  isDark,
}: {
  headers: string[]
  rows: string[][]
  isDark?: boolean
}) {
  const border = isDark ? 'border-[#1e2538]' : 'border-[#D1D5DB]'
  const headBg = isDark ? 'bg-[#111827] text-slate-300' : 'bg-gray-100 text-gray-700'
  const rowBg = isDark ? 'text-gray-200' : 'text-gray-800'
  const altBg = isDark ? 'bg-[#0d1117]' : 'bg-white'
  const altBg2 = isDark ? 'bg-[#0a0e1a]' : 'bg-gray-50'

  return (
    <div
      className="overflow-x-auto my-3 rounded-xl border"
      style={{ borderColor: isDark ? '#1e2538' : '#D1D5DB' }}
    >
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr>
            {headers.map((h, i) => (
              <th
                key={i}
                className={`px-3 py-2 text-left font-semibold border-b text-xs uppercase tracking-wide ${headBg} ${border}`}
              >
                {renderInlineSegment(h, `th-${i}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={ri} className={ri % 2 === 0 ? altBg : altBg2}>
              {row.map((cell, ci) => (
                <td
                  key={ci}
                  className={`px-3 py-2 border-b align-top ${rowBg} ${border}`}
                >
                  {renderInlineSegment(splitCellItems(cell), `td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Main render function. Replaces `renderLatex` everywhere.
 *
 * @param text    Raw text from the DB (may contain markdown tables, LaTeX, etc.)
 * @param isDark  Pass the current theme so table styling matches.
 */
export function renderContent(
  text: string | null | undefined,
  isDark = true,
): React.ReactNode {
  if (!text) return null

  // 0. Rebuild tables whose newlines were lost, then dimension formulas + delimiters (table-safe)
  const prepared = normaliseDelimiters(fixDimensionFormulas(repairBrokenTables(text)))

  // 1. Split into table blocks vs text blocks FIRST.
  //    A table block is a run of lines that all start with `|`.
  const segments: Array<{ type: 'text' | 'table'; content: string }> = []
  let buffer: string[] = []
  let inTable = false

  const flushBuffer = () => {
    if (!buffer.length) return
    const joined = buffer.join('\n')
    if (inTable) {
      segments.push({ type: 'table', content: joined })
    } else if (joined.trim()) {
      segments.push({ type: 'text', content: joined })
    }
    buffer = []
  }

  for (const line of prepared.split('\n')) {
    const t = isTableLine(line)
    if (t !== inTable) {
      flushBuffer()
      inTable = t
    }
    buffer.push(line)
  }
  flushBuffer()

  // 2. Render — statement / duplicate cleanup ONLY on text segments
  return (
    <>
      {segments.map((seg, si) => {
        if (seg.type === 'table') {
          const parsed = parseMarkdownTable(seg.content)
          if (parsed) {
            return <MarkdownTable key={si} {...parsed} isDark={isDark} />
          }
          // Fallback: render as plain text if parse fails
          return (
            <span key={si} className="font-mono text-xs">
              {renderInlineSegment(seg.content, `fb-${si}`)}
            </span>
          )
        }

        const cleaned = normaliseStatements(removeDuplicateSymbols(seg.content))
        return (
          <span key={si} className="leading-relaxed">
            {renderInlineSegment(cleaned, `txt-${si}`)}
          </span>
        )
      })}
    </>
  )
}