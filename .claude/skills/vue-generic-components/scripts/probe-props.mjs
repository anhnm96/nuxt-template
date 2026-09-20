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
 * Balance from the `props:` key.
 *
 * Parens are tracked as well as braces: `withDefaults` and `defineModel` make the compiler
 * emit `props: _mergeDefaults({...}, {...})` / `_mergeModels({...}, {...})` rather than a
 * bare object, and the second argument is where defaults and the model prop live.
 */
function extractProps(code) {
  const at = code.search(/\bprops:/)
  if (at === -1) return null
  let start = at + 'props:'.length
  while (start < code.length && code[start] !== '(' && code[start] !== '{') start++
  if (start >= code.length) return null

  let depth = 0
  for (let i = start; i < code.length; i++) {
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
