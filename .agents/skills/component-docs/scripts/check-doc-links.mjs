#!/usr/bin/env node
/**
 * Resolves every relative link in a Markdown file, including `#anchor` fragments.
 *
 * Docs move. When they do, relative links silently rot — a doc that dropped four directory
 * levels had every `../../` link break, and nothing reported it. Anchors rot the same way
 * when a heading is reworded.
 *
 * Usage:
 *   node check-doc-links.mjs <file.md> [more.md ...]
 *   node check-doc-links.mjs <directory>      # every .md beneath it
 *
 * Exits non-zero if anything is broken, so it can gate a commit.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, relative, resolve } from 'node:path'

const args = process.argv.slice(2)
if (!args.length) {
  console.error('usage: node check-doc-links.mjs <file.md | directory> [...]')
  process.exit(1)
}

function collect(target) {
  if (!existsSync(target)) return []
  if (statSync(target).isFile()) return target.endsWith('.md') ? [target] : []
  return readdirSync(target).flatMap((entry) => {
    if (entry === 'node_modules' || entry.startsWith('.')) return []
    return collect(join(target, entry))
  })
}

/** GitHub-style heading slug: lowercase, drop punctuation, spaces to dashes. */
function slug(heading) {
  return heading
    .trim()
    .toLowerCase()
    .replace(/`/g, '')
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
}

/**
 * Yield only the lines outside fenced code.
 *
 * Fences can nest by length — a ````markdown block wrapping a ```vue one — so a fence closes
 * only on a run of backticks at least as long as the one that opened it. Without this, links
 * *inside* documentation examples get reported as broken, which is how this function came to
 * exist.
 */
function* proseLines(file) {
  let fence = 0
  for (const [i, line] of readFileSync(file, 'utf8').split('\n').entries()) {
    const m = line.match(/^\s*(`{3,})/)
    if (m) {
      if (!fence) {
        fence = m[1].length
        continue
      }
      if (m[1].length >= fence) {
        fence = 0
        continue
      }
    }
    if (!fence) yield [line, i + 1]
  }
}

function headingSlugs(file) {
  const out = new Set()
  for (const [line] of proseLines(file)) {
    const m = line.match(/^#{1,6}\s+(.*)$/)
    if (m) out.add(slug(m[1]))
  }
  return out
}

const files = args.flatMap(collect)
if (!files.length) {
  console.error('No Markdown files found.')
  process.exit(1)
}

let broken = 0
let checked = 0

for (const file of files) {
  const dir = dirname(file)

  const links = []
  for (const [line, lineNo] of proseLines(file)) {
    for (const m of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) links.push([m[1], lineNo])
  }

  for (const [raw, lineNo] of links) {
    // External links and bare in-page anchors are not this script's business.
    if (/^(https?:|mailto:|tel:)/.test(raw)) continue

    const [path, anchor] = raw.split('#')
    checked++

    if (!path) {
      // `#anchor` alone — must exist in this same file.
      if (anchor && !headingSlugs(file).has(anchor)) {
        console.log(`  BROKEN ANCHOR  ${file}:${lineNo}  ->  #${anchor}`)
        broken++
      }
      continue
    }

    const target = resolve(dir, decodeURIComponent(path))
    if (!existsSync(target)) {
      console.log(`  BROKEN LINK    ${file}:${lineNo}  ->  ${raw}`)
      broken++
      continue
    }

    if (anchor && target.endsWith('.md') && !headingSlugs(target).has(anchor)) {
      console.log(`  BROKEN ANCHOR  ${file}:${lineNo}  ->  ${relative(dir, target)}#${anchor}`)
      broken++
    }
  }
}

console.log(
  broken
    ? `\n${broken} broken of ${checked} link(s) across ${files.length} file(s).`
    : `OK — ${checked} link(s) across ${files.length} file(s) all resolve.`,
)
process.exit(broken ? 1 : 0)
