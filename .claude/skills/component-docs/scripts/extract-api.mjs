#!/usr/bin/env node
/**
 * Extracts a component's real public surface and prints Markdown table skeletons.
 *
 * The point is not to save typing — it is that a doc written from memory invents things.
 * Props come from the *compiled* runtime props, so defaults and required-ness are what Vue
 * actually sees, and slot props come from the template AST rather than from recollection.
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
    out.push(`| \`${p.name}\` | \`${p.type}\` | ${def} | |`)
  }
  out.push('')
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
