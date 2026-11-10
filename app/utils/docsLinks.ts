// Rewrites the relative links in README.md, DESIGN.md, CONTEXT.md and ADR files so they
// resolve inside the Docs Site. The files keep their repo-relative links, because they must
// also read correctly on disk and on GitHub.

import type { MinimarkNode } from './minimark'

const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

/** Composables that have a page under `content/docs/composables`, as source name to page slug. */
const DOCUMENTED_COMPOSABLES: Record<string, string> = {
  useListNavigation: 'use-list-navigation',
  useOptionList: 'use-option-list',
  createContext: 'create-context',
  useCheckbox: 'use-checkbox',
  useIntervalValue: 'use-interval-value',
  usePointerDrag: 'use-pointer-drag',
}

function resolvePath(fromDir: string, path: string) {
  const out: string[] = []
  for (const part of `${fromDir}/${path}`.split('/')) {
    if (!part || part === '.') continue
    if (part === '..') out.pop()
    else out.push(part)
  }
  return out
}

/**
 * Returns the Docs Site href for a link written in a repo file, `undefined` when the link needs
 * no change, or `null` when its target (source code, CSS) has no page.
 *
 * `fromDir` is the folder of the linking file, relative to `app/components`, e.g. `base/select`.
 */
export function rewriteDocsHref(href: string, fromDir: string): string | null | undefined {
  if (!href || href.startsWith('#') || href.startsWith('/') || EXTERNAL.test(href)) return undefined

  const hashAt = href.indexOf('#')
  const path = hashAt === -1 ? href : href.slice(0, hashAt)
  const hash = hashAt === -1 ? '' : href.slice(hashAt)

  // Content strips the `.md` extension from relative links, so each pattern makes it optional.
  if (/(?:^|\/)CONTEXT(?:\.md)?$/.test(path)) return `/docs/reference/glossary${hash}`

  // ADRs link to each other by bare file name, so a bare `NNNN-slug.md` is an ADR link.
  const adr = path.match(/(?:^|\/)docs\/adr\/([^/]+?)(?:\.md)?$/) ?? path.match(/^(?:\.\/)?(\d{4}-[^/]+?)(?:\.md)?$/)
  if (adr) return `/docs/reference/adr/${adr[1]}${hash}`

  // A link to a composable source file points at its page, when it has one.
  const composable = path.match(/(?:^|\/)composables\/([^/]+?)(?:\.ts)?$/)
  if (composable && DOCUMENTED_COMPOSABLES[composable[1]!]) {
    return `/docs/composables/${DOCUMENTED_COMPOSABLES[composable[1]!]}${hash}`
  }

  const parts = resolvePath(fromDir, path)
  const file = parts.at(-1)?.replace(/\.md$/, '')
  const folder = parts.at(-2)
  if ((file === 'README' || file === 'DESIGN') && folder) {
    const query = file === 'DESIGN' ? '?tab=design' : ''
    return `/docs/components/${folder.toLowerCase()}${query}${hash}`
  }

  return null
}

/** Walks a Content `minimark` body and returns a copy with every link rewritten. */
export function rewriteBodyLinks<T>(body: T, fromDir: string): T {
  function walk(node: MinimarkNode): MinimarkNode {
    if (!Array.isArray(node)) return node
    const [tag, props, ...children] = node
    const next = children.map(walk)
    const href = props?.href
    if (tag === 'a' && typeof href === 'string') {
      const target = rewriteDocsHref(href, fromDir)
      // A link without a page stays readable but stops being a link.
      if (target === null) return ['span', { ...props, href: undefined, class: 'docs-unlinked' }, ...next]
      if (target !== undefined) return [tag, { ...props, href: target }, ...next]
    }
    return [tag, props, ...next]
  }

  const source = body as { value?: MinimarkNode[] }
  if (!Array.isArray(source?.value)) return body
  return { ...source, value: source.value.map(walk) } as T
}
