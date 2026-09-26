#!/usr/bin/env node
/**
 * Extracts a component's real public surface and prints Markdown table skeletons.
 *
 * The point is not to save typing - it is that a doc written from memory invents things.
 * Defaults and required-ness come from the *compiled* runtime props, so they are what Vue
 * actually sees; the type column prefers the type as *declared*, because Vue drops any part
 * of a type it cannot check at runtime. Slot props come from the template AST rather than
 * from recollection.
 * Fill in the description columns yourself; the columns this prints are facts.
 *
 * Usage: node extract-api.mjs <path/to/Component.vue>
 * Run it from the project root — Vue is resolved from the cwd.
 */
import { extractApi } from './lib/api.mjs'

const file = process.argv[2]
if (!file) {
  console.error('usage: node extract-api.mjs <path/to/Component.vue>')
  process.exit(1)
}

const { props, emits, slots, exposed, dataSlots } = extractApi(file)
const out = [`<!-- extracted from ${file} — fill in the description columns -->\n`]

if (props.length) {
  out.push('## Props\n')
  out.push('| Prop | Type | Default | What it does |')
  out.push('| --- | --- | --- | --- |')
  for (const p of props) {
    const def = p.required ? '— *(required)*' : (p.default || '—')
    // A union type contains `|`, which is the table's own cell separator.
    out.push(`| \`${p.name}\` | \`${p.type.split('|').join('\\|')}\` | ${def} | |`)
  }
  out.push('')

  // Vue validates nothing for these, so the runtime type understates what is accepted.
  // `withDefaults` on a required prop emits both flags. Vue applies the default for an
  // `undefined` prop and warns about nothing, so "required" alone misdescribes it.
  for (const p of props.filter(x => x.required && x.default)) {
    out.push(`<!-- \`${p.name}\`: required, but \`withDefaults\` also gives it \`${p.default}\`, which Vue applies silently when the prop is omitted or \`undefined\` (not \`null\`). -->`)
  }

  // Only where it actually understates: a union loses alternatives, whereas a function
  // alias compiling to `Function` tells a reader nothing new.
  const lossy = props.filter(p => p.skipCheck && p.declared && p.type.includes('|'))
  if (lossy.length) {
    for (const p of lossy) {
      out.push(`<!-- \`${p.name}\`: declared \`${p.type}\`, but Vue compiles it to `
        + `\`${p.runtimeType}\` with \`skipCheck\` - it validates nothing. Document the `
        + `declared type. -->`)
    }
    out.push('')
  }
}

if (emits.length) {
  out.push('## Events\n')
  out.push('| Event | Payload | When |')
  out.push('| --- | --- | --- |')
  for (const e of emits) out.push(`| \`${e}\` | | |`)
  out.push('')
}

if (slots.length) {
  out.push('## Slots\n')
  out.push('| Slot | Props | Content |')
  out.push('| --- | --- | --- |')
  for (const s of slots) {
    const ps = s.props.length ? s.props.map(x => `\`${x}\``).join(', ') : '—'
    out.push(`| \`${s.name}\` | ${ps} | |`)
  }
  out.push('')
}

if (exposed.length) out.push(`**Exposed:** ${exposed.map(e => `\`${e}\``).join(', ')}\n`)
if (dataSlots.length) {
  out.push(`**Styling hooks:** ${dataSlots.map(d => `\`data-slot="${d}"\``).join(', ')}\n`)
}

if (out.length === 1) {
  out.push('_No props, slots, events or exposed members found. Is this the right file?_')
}

console.log(out.join('\n'))
