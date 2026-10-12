#!/usr/bin/env node
/**
 * Prints the runtime props object that `<script setup>` actually compiled to.
 *
 * A prop declaration is compiled twice: once by TypeScript, which erases at build time,
 * and once by the SFC compiler into a runtime `props` object that decides casting,
 * defaults and validation. Only the second one determines what an attribute written on
 * the element becomes at runtime, and the two can disagree without any error.
 *
 * Usage:
 *   node probe-props.mjs <path/to/Component.vue>            # whole props object
 *   node probe-props.mjs <path/to/Component.vue> multiple   # one prop
 *
 * Run it from a directory where Vue is installed (the project root).
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

/**
 * Resolve Vue from the *project being probed*, not from wherever this script lives — a
 * skill may be installed globally, well outside any node_modules.
 */
const requireFromCwd = createRequire(pathToFileURL(`${process.cwd()}/`))
const requireFromHere = createRequire(import.meta.url)

let sfc
for (const req of [requireFromCwd, requireFromHere]) {
  for (const id of ['vue/compiler-sfc', '@vue/compiler-sfc']) {
    try {
      sfc = req(id)
      break
    }
    catch {}
  }
  if (sfc) break
}
if (!sfc) {
  console.error(
    'Could not load vue/compiler-sfc.\n'
    + `Run this from a directory where Vue is installed (current: ${process.cwd()}).`,
  )
  process.exit(1)
}

const file = process.argv[2]
const only = process.argv[3]
if (!file) {
  console.error('usage: node probe-props.mjs <path/to/Component.vue> [propName]')
  process.exit(1)
}

const { descriptor, errors } = sfc.parse(readFileSync(file, 'utf8'), { filename: file })
if (errors.length) {
  console.error(errors.map(e => e.message).join('\n'))
  process.exit(1)
}

let compiled
try {
  compiled = sfc.compileScript(descriptor, { id: 'probe' })
}
catch (e) {
  console.error(`compileScript failed: ${e.message}`)
  process.exit(1)
}

/**
 * Advance past a string literal, a template literal or a comment, so a `props:` written
 * inside one is never mistaken for the key. Returns the index after the token, or `i` when
 * nothing starts at `i`.
 */
function skipToken(code, i) {
  const c = code[i]
  if (c === '/' && code[i + 1] === '/') {
    const end = code.indexOf('\n', i)
    return end === -1 ? code.length : end
  }
  if (c === '/' && code[i + 1] === '*') {
    const end = code.indexOf('*/', i + 2)
    return end === -1 ? code.length : end + 2
  }
  if (c !== '"' && c !== '\'' && c !== '`') return i
  for (let j = i + 1; j < code.length; j++) {
    if (code[j] === '\\') j++
    else if (code[j] === c) return j + 1
  }
  return code.length
}

/**
 * The component's own `props` option, and nothing else that happens to be spelled `props:`.
 *
 * The key is taken only as a *direct member* of the options object that `export default`
 * opens. A bare `code.search(/\bprops:/)` also matches an object literal in setup scope, so a
 * component with no props at all reported someone else's object and exited 0 — the one
 * failure this script exists to rule out.
 *
 * Parens are tracked as well as braces: `withDefaults` and `defineModel` make the compiler
 * emit `props: _mergeDefaults({...}, {...})` / `_mergeModels({...}, {...})` rather than a
 * bare object, and the second argument is where defaults and the model prop live.
 */
function extractProps(code) {
  const exported = code.search(/\bexport\s+default\b/)
  if (exported === -1) return null

  // The options object is the first brace after `export default`; `defineComponent(` opens a
  // paren before it.
  let objStart = -1
  for (let i = exported; i < code.length; i++) {
    const skipped = skipToken(code, i)
    if (skipped !== i) {
      i = skipped - 1
      continue
    }
    if (code[i] === '{') {
      objStart = i
      break
    }
  }
  if (objStart === -1) return null

  let depth = 0
  for (let i = objStart + 1; i < code.length; i++) {
    const skipped = skipToken(code, i)
    if (skipped !== i) {
      i = skipped - 1
      continue
    }
    const c = code[i]
    if (c === '{' || c === '(' || c === '[') depth++
    else if (c === '}' || c === ')' || c === ']') {
      if (depth === 0) return null // end of the options object; no `props` key
      depth--
    }
    else if (depth === 0 && /^props\s*:/.test(code.slice(i, i + 10)) && !/[\w$]/.test(code[i - 1])) {
      return balance(code, code.indexOf(':', i) + 1)
    }
  }
  return null
}

/** The balanced `{...}` or `(...)` that starts at or after `from`. */
function balance(code, from) {
  let start = from
  while (start < code.length && code[start] !== '(' && code[start] !== '{') start++
  if (start >= code.length) return null

  let depth = 0
  for (let i = start; i < code.length; i++) {
    const skipped = skipToken(code, i)
    if (skipped !== i) {
      i = skipped - 1
      continue
    }
    const c = code[i]
    if (c === '(' || c === '{') depth++
    else if (c === ')' || c === '}') {
      depth--
      if (depth === 0) return code.slice(start, i + 1)
    }
  }
  return null
}

const props = extractProps(compiled.content)
if (!props) {
  console.error('No runtime props found. Does this component call defineProps?')
  process.exit(1)
}

if (!only) {
  console.log(props)
  process.exit(0)
}

const prefixes = [`${only}:`, `"${only}":`, `'${only}':`]
const line = props
  .split('\n')
  .find(l => prefixes.some(p => l.trim().startsWith(p)))

console.log(line ? line.trim().replace(/,$/, '') : `prop "${only}" not found`)
