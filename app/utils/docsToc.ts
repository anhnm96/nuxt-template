// The "On this page" list of a Docs Site page. It reads headings from the Content `minimark`
// body, not from the DOM, so the list exists in the prerendered HTML.

import type { MinimarkNode } from './minimark'

export interface TocItem {
  id: string
  text: string
  depth: 2 | 3
}

function textOf(node: MinimarkNode): string {
  if (!Array.isArray(node)) return node
  return node.slice(2).map(child => textOf(child as MinimarkNode)).join('')
}

/** The `h2` and `h3` headings of a body, in document order. A heading with no `id` is skipped. */
export function extractToc(body: unknown): TocItem[] {
  const value = (body as { value?: MinimarkNode[] } | null | undefined)?.value
  if (!Array.isArray(value)) return []

  const items: TocItem[] = []
  for (const node of value) {
    if (!Array.isArray(node)) continue
    const [tag, props] = node
    if (tag !== 'h2' && tag !== 'h3') continue
    const id = props?.id
    if (typeof id !== 'string' || !id) continue
    items.push({ id, text: textOf(node).trim(), depth: tag === 'h2' ? 2 : 3 })
  }
  return items
}
