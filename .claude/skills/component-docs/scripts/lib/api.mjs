/**
 * Reads a component's real public surface out of its compiled output.
 *
 * Shared by `extract-api.mjs` (which formats it) and `check-docs-current.mjs` (which diffs it
 * against the docs). One implementation, so the generator and the checker cannot disagree.
 */
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const requireFromCwd = createRequire(pathToFileURL(`${process.cwd()}/`))
const requireFromHere = createRequire(import.meta.url)

function load(id) {
  for (const req of [requireFromCwd, requireFromHere]) {
    try {
      return req(id)
    }
    catch {}
  }
  return null
}

export function loadCompiler() {
  const sfc = load('vue/compiler-sfc') ?? load('@vue/compiler-sfc')
  if (!sfc) {
    console.error(`Could not load Vue's compiler. Run from the project root (cwd: ${process.cwd()}).`)
    process.exit(1)
  }
  return sfc
}

/**
 * Balance from a key or a call, tracking parens and brackets as well as braces.
 *
 * `withDefaults` and `defineModel` make the compiler emit `props: _mergeModels({...}, {...})`
 * rather than a bare object, and `defineExpose(...)` is a call with no colon at all — so the
 * opener has to be found rather than assumed.
 */
function balancedAfter(code, key) {
  const at = code.search(new RegExp(`\\b${key}\\s*[:(]`))
  if (at === -1) return null
  let start = at + key.length
  while (start < code.length && !'({['.includes(code[start])) start++
  if (start >= code.length) return null

  let depth = 0
  for (let i = start; i < code.length; i++) {
    if ('({['.includes(code[i])) depth++
    else if (')}]'.includes(code[i])) {
      depth--
      if (depth === 0) return code.slice(start, i + 1)
    }
  }
  return null
}

export function extractApi(file) {
  const sfc = loadCompiler()
  const { descriptor, errors } = sfc.parse(readFileSync(file, 'utf8'), { filename: file })
  if (errors.length) {
    console.error(errors.map(e => e.message).join('\n'))
    process.exit(1)
  }

  let compiled = ''
  try {
    compiled = sfc.compileScript(descriptor, { id: 'extract' }).content
  }
  catch (e) {
    console.error(`compileScript failed for ${file}: ${e.message}`)
    process.exit(1)
  }

  // ------------------------------------------------------------- props
  const propsBlock = balancedAfter(compiled, 'props') ?? ''
  const props = []
  // Scan `name: { ... }` with a balanced match rather than line by line — `defineModel`
  // emits its prop across several lines, which a per-line regex reports as having no type
  // and no default, i.e. as though there were none.
  for (const m of propsBlock.matchAll(/["'`]?([A-Za-z_$][\w$]*)["'`]?\s*:\s*\{/g)) {
    const name = m[1]
    // `defineModel` also emits a `<name>Modifiers` prop. Machinery, not public API.
    if (/Modifiers$/.test(name)) continue

    const open = propsBlock.indexOf('{', m.index + m[0].length - 1)
    let depth = 0
    let body = ''
    for (let i = open; i < propsBlock.length; i++) {
      if (propsBlock[i] === '{') depth++
      else if (propsBlock[i] === '}') {
        depth--
        if (depth === 0) {
          body = propsBlock.slice(open + 1, i)
          break
        }
      }
    }
    // A runtime type can be an array (`[Boolean, Function]`), so match brackets before commas.
    const type = (body.match(/type:\s*(\[[^\]]*\]|[^,}\n]+)/) ?? [, '—'])[1].trim()
    const def = body.match(/default:\s*([^,}\n]+)/)
    props.push({
      name,
      type,
      required: /required:\s*true/.test(body),
      default: def ? def[1].trim() : '',
    })
  }

  // ------------------------------------------------------------- emits
  const emitsBlock = balancedAfter(compiled, 'emits') ?? ''
  const emits = [...emitsBlock.matchAll(/["'`]([^"'`]+)["'`]/g)].map(m => m[1])

  // ------------------------------------------------------------- expose
  const exposeBlock = descriptor.scriptSetup
    ? balancedAfter(descriptor.scriptSetup.content, 'defineExpose') ?? ''
    : ''
  const exposed = [...new Set(
    [...exposeBlock.matchAll(/^\s*([A-Za-z_$][\w$]*)\s*[,:(]/gm)].map(m => m[1]),
  )]

  // ------------------------------------------------------- slots + hooks
  const slots = []
  const dataSlots = new Set()
  if (descriptor.template) {
    const ast = descriptor.template.ast
      ?? sfc.compileTemplate({ source: descriptor.template.content, filename: file, id: 'extract' }).ast

    const walk = (node) => {
      if (node.type === 1) {
        for (const p of node.props ?? []) {
          if (p.type === 6 && p.name === 'data-slot' && p.value) dataSlots.add(p.value.content)
        }
        if (node.tag === 'slot') {
          let name = 'default'
          const bound = []
          for (const p of node.props ?? []) {
            if (p.type === 6) {
              if (p.name === 'name') name = p.value?.content ?? 'default'
              else bound.push(p.name)
            }
            else if (p.type === 7 && p.name === 'bind') {
              if (p.arg?.content) {
                bound.push(p.arg.content)
              }
              else {
                // `v-bind="{ a, b }"` carries the real slot props — name them.
                const expr = p.exp?.content ?? ''
                const keys = [...expr.matchAll(/([A-Za-z_$][\w$]*)\s*[,:}]/g)].map(k => k[1])
                bound.push(...(keys.length ? keys : ['(forwarded)']))
              }
            }
          }
          slots.push({ name, props: [...new Set(bound)] })
        }
      }
      for (const child of node.children ?? []) if (typeof child === 'object') walk(child)
    }
    if (ast) walk(ast)
  }

  return { props, emits, slots, exposed, dataSlots: [...dataSlots] }
}
