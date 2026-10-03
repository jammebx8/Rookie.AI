/**
 * renderContent
 * ─────────────
 * Renders question / solution text that may contain any combination of:
 *   • LaTeX:           $inline$  or  $$block$$
 *                      \(...\)   or  \[...\]      (normalized → $ delimiters)
 *                      bare LaTeX lines like  \mathrm{...}=...  (auto-wrapped)
 *   • Markdown tables: | H1 | H2 | … rows
 *   • Statement lists: (A) text (B) text  — run together without newlines
 *   • Bold:            **text**
 *   • Newlines:        \n  →  <br />
 *
 * Call this instead of the old bare `renderLatex` everywhere.
 */

import React from 'react'
import { InlineMath, BlockMath } from 'react-katex'

// ── LaTeX delimiter normalisation ─────────────────────────────────────────────
/**
 * Normalise every LaTeX delimiter variant the AI (or DB) might produce into
 * the two delimiters react-katex understands: $...$ and $$$...$$$.
 *
 * Pass 1 — explicit delimiters emitted by the AI:
 *   \[ ... \]   →  $$...$$   (display)
 *   \( ... \)   →  $...$     (inline)
 *
 * Pass 2 — bare LaTeX lines from the DB:
 *   A line that contains at least one LaTeX command (\cmd) or common math
 *   tokens and has no surrounding $ already is treated as a display equation
 *   and wrapped in $$ $$.
 *
 *   Heuristic: the line must contain a backslash command OR a fraction/
 *   subscript/superscript pattern AND must NOT be a normal sentence.
 */

// Tokens that strongly indicate a line is raw LaTeX math, not prose
const LATEX_CMD_RE = /\\[a-zA-Z]+\{|\\[a-zA-Z]+\s|\\[,;!]|\\Rightarrow|\\rightarrow|\\Leftarrow|\\leftarrow|\\ldots|\\cdots|\\times|\\div|\\pm|\\mp|\\geq|\\leq|\\neq|\\approx|\\propto|\\infty|\\alpha|\\beta|\\gamma|\\theta|\\mu|\\pi|\\sigma|\\omega/

function isBareLaTeXLine(line: string): boolean {
  const t = line.trim()
  if (!t) return false
  // Already has $ delimiters — leave alone
  if (/\$/.test(t)) return false
  // Check for LaTeX commands
  if (LATEX_CMD_RE.test(t)) return true
  // Lines that are ONLY math-like tokens: =, ^, _, {, }, \
  if (/^[=+\-*/^_{}\\\s\d().[\],]+$/.test(t) && /[\\^_{}]/.test(t)) return true
  return false
}

function normaliseDelimiters(text: string): string {
  // Pass 1 — replace explicit bracket-style delimiters
  // \[ ... \]  →  $$...$$  (non-greedy, multiline)
  let out = text.replace(/\\\[([\s\S]+?)\\\]/g, (_m, inner) => `$$${inner.trim()}$$`)
  // \( ... \)  →  $...$
  out = out.replace(/\\\(([^)]+?)\\\)/g, (_m, inner) => `$${inner.trim()}$`)

  // Pass 2 — wrap bare LaTeX lines (from DB solutions)
  // Process line by line so we don't accidentally merge equations
  const lines = out.split('\n')
  const result: string[] = []
  for (const line of lines) {
    if (isBareLaTeXLine(line)) {
      result.push(`$$${line.trim()}$$`)
    } else {
      result.push(line)
    }
  }
  return result.join('\n')
}

/**
 * Remove PDF-extraction artifacts where a symbol appears twice in a row —
 * once as rendered text, once as the source symbol — e.g. "(M)(M)", "F=maF=ma".
 * Pattern: a parenthesised group immediately followed by itself: (X)(X) → (X)
 * Also handles bare duplicates like "mgsinθmgsinθ" at word boundaries.
 */
function removeDuplicateSymbols(text: string): string {
  // (X)(X) → (X)
  let out = text.replace(/(\([^)]{1,40}\))\1/g, '$1')
  // word/symbol run duplicated: e.g. "F=maF=ma" or "mgsinθmgsinθ"
  // Only collapse if the repeated segment is 3–40 chars and contains = or a Greek letter
  out = out.replace(/([A-Za-zα-ωΑ-Ω=+\-^_\d]{3,40})\1/g, '$1')
  return out
}

// ── helpers ──────────────────────────────────────────────────────────────────

/** Render a single segment that contains no tables.  Handles LaTeX + bold + newlines. */
function renderInlineSegment(text: string, baseKey: string): React.ReactNode {
  if (!text) return null

  // Split on LaTeX first so we never try to parse $...$ inside table cells.
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[^\n]+?\$)/)

  return parts.map((part, i) => {
    const key = `${baseKey}-${i}`

    if (part.startsWith('$$') && part.endsWith('$$')) {
      return <BlockMath key={key} math={part.slice(2, -2)} />
    }
    if (part.startsWith('$') && part.endsWith('$')) {
      return <InlineMath key={key} math={part.slice(1, -1)} />
    }

    // Bold (**text**) + newlines inside plain text segments
    const boldParts = part.split(/(\*\*[^*]+\*\*)/)
    const nodes: React.ReactNode[] = []
    boldParts.forEach((bp, bi) => {
      if (bp.startsWith('**') && bp.endsWith('**')) {
        nodes.push(<strong key={`${key}-b${bi}`}>{bp.slice(2, -2)}</strong>)
        return
      }
      // split on newlines → insert <br />
      const lines = bp.split('\n')
      lines.forEach((line, li) => {
        if (li > 0) nodes.push(<br key={`${key}-b${bi}-br${li}`} />)
        if (line) nodes.push(<React.Fragment key={`${key}-b${bi}-l${li}`}>{line}</React.Fragment>)
      })
    })
    return <React.Fragment key={key}>{nodes}</React.Fragment>
  })
}

/** Parse a markdown table string into a 2-D array of cell strings. */
function parseMarkdownTable(raw: string): { headers: string[]; rows: string[][] } | null {
  const lines = raw
    .trim()
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.startsWith('|') && l.endsWith('|'))

  if (lines.length < 2) return null

  const parseCells = (line: string) =>
    line
      .slice(1, -1)           // strip leading/trailing |
      .split('|')
      .map(c => c.trim())

  const headers = parseCells(lines[0])

  // lines[1] is the separator (---|---) — skip it
  const separatorIdx = lines.findIndex((l, i) => i > 0 && /^\|[\s|:-]+\|$/.test(l))
  const dataStart = separatorIdx >= 0 ? separatorIdx + 1 : 1

  const rows = lines.slice(dataStart).map(parseCells)

  return { headers, rows }
}

/** Render a parsed markdown table as a styled <table>. */
function MarkdownTable({ headers, rows, isDark }: {
  headers: string[]; rows: string[][]; isDark?: boolean
}) {
  const border = isDark ? 'border-[#1e2538]' : 'border-[#D1D5DB]'
  const headBg = isDark ? 'bg-[#111827] text-slate-300' : 'bg-gray-100 text-gray-700'
  const rowBg  = isDark ? 'text-gray-200' : 'text-gray-800'
  const altBg  = isDark ? 'bg-[#0d1117]' : 'bg-white'
  const altBg2 = isDark ? 'bg-[#0a0e1a]' : 'bg-gray-50'

  return (
    <div className="overflow-x-auto my-3 rounded-xl border" style={{ borderColor: isDark ? '#1e2538' : '#D1D5DB' }}>
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
                  className={`px-3 py-2 border-b ${rowBg} ${border}`}
                >
                  {renderInlineSegment(cell, `td-${ri}-${ci}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Pre-process plain text: insert a newline before each statement marker
 * so `(A) foo (B) bar` becomes `(A) foo\n(B) bar`.
 * Markers: (A)–(Z), (I)–(X) roman numerals, (i)–(x), (1)–(9)
 * Only fires when there's NO existing newline already before the marker.
 */
function normaliseStatements(text: string): string {
  // Insert \n before (X) / (i) / (1) style markers that follow non-newline content
  return text.replace(
    /(?<!\n)\s*\(([A-Z]{1,3}|[a-z]{1,3}|[0-9]{1,2})\)\s+/g,
    (match, _group, offset) => {
      // Don't add a leading newline at the very start of the string
      if (offset === 0) return match
      return `\n(${_group}) `
    },
  )
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Main render function.  Replaces `renderLatex` everywhere.
 *
 * @param text    Raw text from the DB (may contain markdown tables, LaTeX, etc.)
 * @param isDark  Pass the current theme so table styling matches.
 */
export function renderContent(
  text: string | null | undefined,
  isDark = true,
): React.ReactNode {
  if (!text) return null

  // 0. Normalise \[...\] → $$...$$ and \(...\) → $...$ and wrap bare LaTeX lines
  const delimNorm = normaliseDelimiters(text)

  // 0.5 Remove PDF-extraction duplicate-symbol artifacts like (M)(M), F=maF=ma
  const deduped = removeDuplicateSymbols(delimNorm)

  // 1. Normalise statement lists so they sit on separate lines
  const normalised = normaliseStatements(deduped)

  // 2. Split into table blocks vs regular text blocks.
  //    A table block is a run of lines that all start with `|`.
  const segments: Array<{ type: 'text' | 'table'; content: string }> = []
  const lines = normalised.split('\n')
  let buffer: string[] = []
  let inTable = false

  const flushBuffer = () => {
    if (!buffer.length) return
    const joined = buffer.join('\n')
    if (inTable) {
      segments.push({ type: 'table', content: joined })
    } else {
      // Only push if non-empty after trimming
      if (joined.trim()) segments.push({ type: 'text', content: joined })
    }
    buffer = []
  }

  for (const line of lines) {
    const isTableLine = /^\s*\|/.test(line)
    if (isTableLine !== inTable) {
      flushBuffer()
      inTable = isTableLine
    }
    buffer.push(line)
  }
  flushBuffer()

  // 3. Render each segment
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

        // text segment — render inline (LaTeX + bold + newlines)
        return (
          <span key={si} className="leading-relaxed">
            {renderInlineSegment(seg.content, `txt-${si}`)}
          </span>
        )
      })}
    </>
  )
}
