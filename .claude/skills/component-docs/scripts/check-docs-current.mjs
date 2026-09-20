#!/usr/bin/env node
/**
 * Compares a component's real API against what its README documents.
 *
 * Catches the two mechanical halves of doc drift: something added to the code and never
 * written down, and something written down that no longer exists (or never did — an invented
 * prop reads exactly like a removed one).
 *
 * What it cannot catch: prose that has quietly become untrue. A keymap row, a loading
 * behaviour, an a11y claim — those need the diff read by a human or an agent. Treat a clean
 * run as "the surface matches", not "the docs are correct".
 *
 * Usage:
 *   node check-docs-current.mjs <path/to/Component.vue> [path/to/README.md]
 *   node check-docs-current.mjs <component-directory>
 *
 * Exits non-zero when the surface and the docs disagree.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join } from 'node:path'
import { extractApi } from './lib/api.mjs'

const [target, explicitDoc] = process.argv.slice(2)
if (!target) {
  console.error('usage: node check-docs-current.mjs <Component.vue | directory> [README.md]')
  process.exit(1)
}

let componentFile = target
let docFile = explicitDoc

if (existsSync(target) && statSync(target).isDirectory()) {
  const entries = readdirSync(target)
  docFile ??= entries.includes('README.md') ? join(target, 'README.md') : null
  // The component sharing the folder's name, else the only .vue that is not a sub-part.
  const vues = entries.filter(e => e.endsWith('.vue'))
  const named = vues.find(e => basename(e, '.vue').toLowerCase() === basename(target).toLowerCase())
  componentFile = join(target, named ?? vues[0] ?? '')
}

if (!componentFile || !existsSync(componentFile)) {
  console.error(`No component file found at ${target}`)
  process.exit(1)
}
docFile ??= join(componentFile, '..', 'README.md')
if (!existsSync(docFile)) {
  console.error(`No README.md found for ${componentFile}`)
  process.exit(1)
}

const api = extractApi(componentFile)
const doc = readFileSync(docFile, 'utf8')

/**
 * Collect first-column table cells, but only from sections that describe the API.
 *
 * A README's other tables — keyboard maps, CSS variables — use the same row shape, and
 * treating `Escape` or `--trigger-width` as a claimed prop buries the real findings in noise.
 */
function readDoc(body) {
  const apiCells = new Set()
  const prose = []
  let inApiSection = false
  let fence = 0

  for (const line of body.split('\n')) {
    const f = line.match(/^[\s>]*(`{3,})/)
    if (f) {
      if (!fence) fence = f[1].length
      else if (f[1].length >= fence) fence = 0
      continue
    }
    // Fenced code must be dropped before any inline-backtick scan: a ``` marker pairs with
    // a real backtick further down and swallows everything between, so a term genuinely
    // present in the prose reads as missing.
    if (fence) continue
    prose.push(line)

    const heading = line.match(/^#{2,6}\s+(.*)$/)
    if (heading) {
      inApiSection = /prop|event|emit|slot|api/i.test(heading[1])
      continue
    }
    if (!inApiSection) continue

    const cell = line.match(/^\|\s*`([^`]+)`\s*\|/)
    if (cell) apiCells.add(cell[1].trim())
  }
  return { apiCells, prose: prose.join('\n') }
}

const { apiCells, prose } = readDoc(doc)
/** Anything the prose puts in backticks, matched loosely — `toggleShow(value?: boolean)`. */
const inBackticks = [...prose.matchAll(/`([^`]+)`/g)].map(m => m[1])
const mentioned = name =>
  apiCells.has(name) || inBackticks.some(t => new RegExp(`\\b${name.replace(/[$]/g, '\\$&')}\\b`).test(t))

const problems = []
/** A `v-model` prop is conventionally documented in prose, not as a props-table row. */
const modelProps = new Set(api.emits.filter(e => e.startsWith('update:')).map(e => e.slice(7)))
const documentsVModel = /v-model/.test(doc)

for (const p of api.props) {
  if (modelProps.has(p.name) && documentsVModel) continue
  if (!mentioned(p.name)) problems.push(`  UNDOCUMENTED  prop \`${p.name}\``)
}
for (const e of api.emits) {
  if (e.startsWith('update:') && documentsVModel) continue
  if (!mentioned(e)) problems.push(`  UNDOCUMENTED  event \`${e}\``)
}
for (const s of api.slots) {
  if (s.name !== 'default' && !mentioned(s.name)) problems.push(`  UNDOCUMENTED  slot \`${s.name}\``)
}
for (const x of api.exposed) {
  if (!mentioned(x)) problems.push(`  UNDOCUMENTED  exposed \`${x}\``)
}

// The reverse direction: an API-table row naming something the component no longer has.
const realNames = new Set([
  ...api.props.map(p => p.name),
  ...api.emits,
  ...api.slots.map(s => s.name),
  ...api.exposed,
])
for (const name of apiCells) {
  if (!/^[a-z][\w$]*$/i.test(name)) continue
  if (realNames.has(name)) continue
  problems.push(`  STALE?        \`${name}\` is an API-table row but is not a prop, event, slot or exposed member`)
}

console.log(`${componentFile}  vs  ${docFile}\n`)
if (!problems.length) {
  console.log(`OK — ${api.props.length} prop(s), ${api.emits.length} event(s), `
    + `${api.slots.length} slot(s), ${api.exposed.length} exposed member(s) all appear in the README.`)
  console.log('\nNote: this checks the API surface only. Prose can still be out of date.')
  process.exit(0)
}

console.log(problems.join('\n'))
console.log(`\n${problems.length} discrepancy/-ies. "STALE?" rows may be false positives — `
  + 'a keyboard or CSS table uses the same shape.')
process.exit(1)
