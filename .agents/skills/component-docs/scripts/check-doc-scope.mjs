#!/usr/bin/env node
/**
 * Checks a component README for things a consumer of the library cannot use.
 *
 * Three faults, all of which survive review because each one reads as a helpful detail at the
 * moment it is written:
 *
 *   - **History.** A migration table, a named predecessor, a note about what the code used to
 *     do. It is true, and it is useless to someone who arrives after the migration.
 *   - **Application context.** A path into `app/pages/`, a count of call sites, a claim about
 *     how this application uses the component. A reader outside this repo has none of our
 *     routes, and a reader inside has no use for the count.
 *   - **A path that no longer exists.** `pages/test/select-types.vue` outlived the directory
 *     it named, in three docs at once. Nothing resolves a path written in backticks.
 *
 * Only `pages/` is out of bounds, and `pages/playground/` is exempt from that: its files exist
 * to demonstrate the component. Every other directory under `app/` — `assets/`, `composables/`,
 * `constants/`, `plugins/`, `stores/`, `types/`, `utils/` — ships beside the components, so a
 * README may name a file in one.
 *
 * DESIGN.md is checked for broken paths only. It is read by a maintainer, who is entitled to
 * the history and to the call sites.
 *
 * Usage:
 *   node check-doc-scope.mjs <file.md | directory> [...]
 *
 * Exits non-zero on any finding, so it can gate a commit.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

const args = process.argv.slice(2)
if (!args.length) {
  console.error('usage: node check-doc-scope.mjs <file.md | directory> [...]')
  process.exit(1)
}

/** Nearest ancestor holding a package.json. Paths in docs are written relative to it. */
function repoRoot(from) {
  let dir = resolve(from)
  if (statSync(dir).isFile()) dir = dirname(dir)
  for (;;) {
    if (existsSync(join(dir, 'package.json'))) return dir
    const up = dirname(dir)
    if (up === dir) return resolve('.')
    dir = up
  }
}

function collect(target) {
  // A typo in the path otherwise reports a clean run, which is the worst thing a gate can do.
  if (!existsSync(target)) {
    console.error(`no such file or directory: ${target}`)
    process.exit(1)
  }
  if (statSync(target).isFile()) return target.endsWith('.md') ? [target] : []
  return readdirSync(target).flatMap((entry) => {
    if (entry === 'node_modules' || entry.startsWith('.')) return []
    return collect(join(target, entry))
  })
}

/**
 * Development history. Each pattern names the *subject*, not a bare verb, so ordinary prose
 * survives: "the Thumb moves to the new position" is not a migration.
 */
const HISTORY = [
  [/\bPrimeVue\b/i, 'names the library this replaced'],
  [/\bmigrat(e|es|ed|ing|ion)\b/i, 'describes a migration'],
  [/\blegacy\b/i, 'describes superseded code'],
  [/\brefactor(ed|ing)?\b/i, 'describes a past change to this code'],
  [/\b(used to|used to be)\b/i, 'describes what the code used to do'],
  [/\bpre-(migration|rewrite|release)\b/i, 'dates the text against a past state'],
  [/\b(the )?(old|previous|former) (implementation|component|version|API|behaviour|behavior)\b/i, 'compares against a predecessor'],
  [/\bbefore the (rewrite|migration|change)\b/i, 'compares against a predecessor'],
]

/** Application context. A consumer has none of these files and none of these pages. */
const APP_CONTEXT = [
  [/(?<!playground\/)\bpages\/(?!playground\/)[\w.-]+/i, 'points into the application'],
  [/\b(this|our) app\b/i, 'describes the application, not the component'],
  [/\b(all |the )?\d+ call sites?\b/i, 'counts internal call sites'],
  [/\bat (the )?\w+ call sites? in\b/i, 'counts internal call sites'],
]

/** A backticked token that looks like a repo path, so its existence can be resolved. */
const PATH_TOKEN = /`([\w.@~-]*(?:\/[\w.@-]+)+\.(?:vue|ts|tsx|js|mjs|css|md|json))`/g

/**
 * Every directory a path in this file may be written relative to: its own directory, each
 * ancestor up to the repository root, and `app/`. Docs address a sibling component as
 * `base/select/DESIGN.md` and a page as `pages/playground/slider.vue`, both of which resolve
 * against an ancestor rather than against the root.
 */
function bases(file, root) {
  const list = []
  let dir = dirname(resolve(file))
  for (;;) {
    list.push(dir)
    if (dir === root) break
    const up = dirname(dir)
    if (up === dir) break
    dir = up
  }
  list.push(join(root, 'app'))
  return list
}

/**
 * Fenced code is skipped for prose rules and kept for path rules: an import in an example is
 * exactly where a stale path hides.
 */
function scan(file) {
  const root = repoRoot(file)
  const findings = []
  const isReadme = /README\.md$/i.test(file)
  let fence = 0

  readFileSync(file, 'utf8').split('\n').forEach((line, i) => {
    const open = line.match(/^\s*(`{3,})/)
    if (open) {
      if (!fence) fence = open[1].length
      else if (open[1].length >= fence) fence = 0
      return
    }

    for (const match of line.matchAll(PATH_TOKEN)) {
      const raw = match[1].replace(/^[~@]\//, '')
      const found = bases(file, root).some((base) => existsSync(resolve(base, raw)))
      if (!found) findings.push({ line: i + 1, rule: 'stale-path', text: raw, why: 'no such file' })
    }

    if (fence || !isReadme) return

    for (const [pattern, why] of [...HISTORY, ...APP_CONTEXT]) {
      const hit = line.match(pattern)
      if (hit) {
        const rule = HISTORY.some(([p]) => p === pattern) ? 'history' : 'app-context'
        findings.push({ line: i + 1, rule, text: hit[0], why })
      }
    }
  })

  /*
    Two patterns may describe one phrase — "the 9 call sites" sits inside "at the 9 call sites
    in". Reporting both doubles the count without naming a second defect, so the shorter match
    is dropped. Distinct words on one line are kept: three history terms in one sentence are
    three things to rewrite.
  */
  return findings.filter((f) => !findings.some((other) =>
    other !== f && other.line === f.line && other.rule === f.rule && other.text.includes(f.text)))
}

let total = 0
for (const file of args.flatMap(collect)) {
  const findings = scan(file)
  if (!findings.length) continue
  total += findings.length
  console.log(`\n${file}`)
  for (const f of findings) console.log(`  ${String(f.line).padStart(4)}  ${f.rule.padEnd(11)} ${JSON.stringify(f.text)} — ${f.why}`)
}

if (!total) {
  console.log('OK — no history, no application context, no stale paths.')
  process.exit(0)
}
console.log(`\n${total} finding(s). A README documents a general-purpose component; a maintainer's reasoning belongs in DESIGN.md.`)
process.exit(1)
