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

/**
 * Recover the *declared* prop types from the source.
 *
 * The compiled `props` object is authoritative about runtime behaviour, but it is lossy about
 * intent: a type Vue cannot represent at runtime is dropped and the prop is marked
 * `skipCheck`. `target?: true | string | HTMLElement` compiles to
 * `{ type: [Boolean, String], skipCheck: true }` — documenting that would tell a reader an
 * element is not accepted, when in fact the check is disabled and anything is.
 *
 * So the declared type wins when we can find it, and the runtime type is the fallback.
 */
function declaredPropTypes(source) {
  const types = new Map()
  const clean = source
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    // `(^|\s)` so a `//` inside a string literal type ('https://…') survives.
    .replace(/(^|\s)\/\/[^\n]*/g, '$1')

  // `defineModel<T>()` is compiled into the same props object, but its declared type
  // lives in the call, not in the props type literal.
  for (const m of clean.matchAll(/defineModel\s*</g)) {
    const t = balancedAngle(clean, clean.indexOf('<', m.index))
    if (!t) continue
    // `defineModel<T>('open')` names its prop; a bare one is `modelValue`.
    const after = clean.slice(clean.indexOf('<', m.index) + t.length + 1)
    const named = after.match(/^\s*\(\s*['"`]([^'"`]+)['"`]/)
    types.set(named ? named[1] : 'modelValue', t.replace(/\s+/g, ' ').trim())
  }

  const body = propsTypeLiteral(clean)
  if (!body) return types

  for (const member of splitMembers(body)) {
    const m = member.match(/^([A-Za-z_$][\w$]*)\s*(\??)\s*:\s*([\s\S]+)$/)
    if (m) types.set(m[1], m[3].replace(/\s+/g, ' ').trim())
  }
  return types
}

/** The `{ … }` body of `defineProps<T>()`, following one level of alias or interface. */
function propsTypeLiteral(code) {
  const at = code.search(/defineProps\s*</)
  if (at === -1) return null
  const arg = balancedAngle(code, code.indexOf('<', at))
  if (!arg) return null

  if (arg.trimStart().startsWith('{')) return balancedBrace(arg, arg.indexOf('{'))

  // `defineProps<SelectProps<I, CK>>()` — resolve the name against a local declaration.
  const name = arg.match(/^\s*([A-Za-z_$][\w$]*)/)?.[1]
  if (!name) return null
  const decl = code.search(new RegExp(`\\b(?:interface\\s+${name}\\b|type\\s+${name}\\b[^=]*=)`))
  if (decl === -1) return null
  const brace = code.indexOf('{', decl)
  return brace === -1 ? null : balancedBrace(code, brace)
}

function balancedBrace(code, open) {
  if (open === -1) return null
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}' && --depth === 0) return code.slice(open + 1, i)
  }
  return null
}

function balancedAngle(code, open) {
  if (open === -1) return null
  let depth = 0
  for (let i = open; i < code.length; i++) {
    if (code[i] === '<') depth++
    // `=>` is not a closing bracket.
    else if (code[i] === '>' && code[i - 1] !== '=' && --depth === 0) return code.slice(open + 1, i)
  }
  return null
}

/**
 * Split an interface body into members.
 *
 * `,` and `;` only separate at depth zero, and a newline only when what follows starts a new
 * member — otherwise `filterFn?: (item: T, query: string) => boolean` splits at its comma and
 * a type wrapped across two lines is truncated.
 */
function splitMembers(body) {
  const out = []
  let buf = ''
  let depth = 0
  const OPEN = '{[(<'
  const CLOSE = '}])>'

  for (let i = 0; i < body.length; i++) {
    const c = body[i]
    if (OPEN.includes(c)) depth++
    else if (CLOSE.includes(c) && !(c === '>' && body[i - 1] === '=')) depth = Math.max(0, depth - 1)

    if (depth === 0 && (c === ',' || c === ';')) {
      out.push(buf.trim())
      buf = ''
      continue
    }
    if (depth === 0 && c === '\n' && /^\s*[A-Za-z_$][\w$]*\s*\??\s*:/.test(body.slice(i + 1))) {
      out.push(buf.trim())
      buf = ''
      continue
    }
    buf += c
  }
  out.push(buf.trim())
  return out.filter(Boolean)
}

/**
 * The `default:` value, read quote- and bracket-aware.
 *
 * A comma is not always a separator: `separator: ', '` and `items: () => []` both carry one
 * inside the value, and a regex that stops at the first comma prints `'` as the default -
 * which is not only wrong but breaks the Markdown table it lands in.
 */
function defaultValue(body) {
  const at = body.search(/(^|[,{\s])default\s*:/)
  if (at === -1) return ''
  let i = body.indexOf(':', at) + 1
  let depth = 0
  let quote = null
  let out = ''
  for (; i < body.length; i++) {
    const c = body[i]
    if (quote) {
      out += c
      if (c === quote && body[i - 1] !== '\\') quote = null
      continue
    }
    if (c === '"' || c === "'" || c === '`') {
      quote = c
      out += c
      continue
    }
    if ('{[('.includes(c)) depth++
    else if ('}])'.includes(c)) {
      if (depth === 0) break
      depth--
    }
    else if (depth === 0 && (c === ',' || c === '\n')) break
    out += c
  }
  return out.trim()
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
  const declared = declaredPropTypes(`${descriptor.script?.content ?? ''}
${descriptor.scriptSetup?.content ?? ''}`)
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
    const runtimeType = (body.match(/type:\s*(\[[^\]]*\]|[^,}\n]+)/) ?? [, '—'])[1].trim()
    const def = defaultValue(body)
    // `skipCheck` means Vue could not represent the declared type and validates nothing,
    // so the runtime type is a lower bound rather than the contract.
    const lossy = /skipCheck:\s*true/.test(body)
    props.push({
      name,
      type: declared.get(name) ?? runtimeType,
      runtimeType,
      declared: declared.has(name),
      skipCheck: lossy,
      required: /required:\s*true/.test(body),
      default: def,
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
