import { describe, expect, it } from 'vitest'
import { rewriteBodyLinks, rewriteDocsHref } from './docsLinks'

describe('rewriteDocsHref', () => {
  const from = 'base/select'

  it('leaves external, anchor and absolute links alone', () => {
    expect(rewriteDocsHref('https://example.com/x.md', from)).toBeUndefined()
    expect(rewriteDocsHref('#keyboard', from)).toBeUndefined()
    expect(rewriteDocsHref('/docs/components/select', from)).toBeUndefined()
  })

  it('sends a sibling DESIGN.md to the Design tab and README.md to the component', () => {
    expect(rewriteDocsHref('./DESIGN.md', from)).toBe('/docs/components/select?tab=design')
    expect(rewriteDocsHref('./README.md#v-model', from)).toBe('/docs/components/select#v-model')
  })

  it('resolves another component by its folder', () => {
    expect(rewriteDocsHref('../popover/README.md', from)).toBe('/docs/components/popover')
    expect(rewriteDocsHref('../ToggleButton/DESIGN.md', from)).toBe('/docs/components/togglebutton?tab=design')
  })

  it('sends CONTEXT.md to the glossary and keeps the anchor', () => {
    expect(rewriteDocsHref('../../../../CONTEXT.md#popover', from)).toBe('/docs/reference/glossary#popover')
  })

  it('sends ADR links, full path or bare file name, to the ADR pages', () => {
    expect(rewriteDocsHref('../../../../docs/adr/0001-select-uses-aria-activedescendant.md', from))
      .toBe('/docs/reference/adr/0001-select-uses-aria-activedescendant')
    expect(rewriteDocsHref('0013-popover-mechanism-is-separate-from-dropdown.md', ''))
      .toBe('/docs/reference/adr/0013-popover-mechanism-is-separate-from-dropdown')
  })

  it('handles links whose .md extension Content already stripped', () => {
    expect(rewriteDocsHref('./DESIGN', from)).toBe('/docs/components/select?tab=design')
    expect(rewriteDocsHref('../popover/README#x', from)).toBe('/docs/components/popover#x')
    expect(rewriteDocsHref('../../../../CONTEXT', from)).toBe('/docs/reference/glossary')
    expect(rewriteDocsHref('../../../../docs/adr/0001-a-b', from)).toBe('/docs/reference/adr/0001-a-b')
    expect(rewriteDocsHref('0013-x-y', '')).toBe('/docs/reference/adr/0013-x-y')
  })

  it('sends a documented composable source file to its page', () => {
    expect(rewriteDocsHref('../../../composables/useOptionList.ts', from)).toBe('/docs/composables/use-option-list')
    expect(rewriteDocsHref('../../../composables/useListNavigation', from)).toBe('/docs/composables/use-list-navigation')
  })

  it('sends every documented composable to its own page', () => {
    expect(rewriteDocsHref('../../../composables/useCheckbox.ts', from)).toBe('/docs/composables/use-checkbox')
    expect(rewriteDocsHref('../../../composables/useIntervalValue.ts', from)).toBe('/docs/composables/use-interval-value')
    expect(rewriteDocsHref('../../../composables/usePointerDrag.ts', from)).toBe('/docs/composables/use-pointer-drag')
    expect(rewriteDocsHref('../../../composables/useListboxOpen.ts', from)).toBe('/docs/composables/use-listbox-open')
    expect(rewriteDocsHref('../../../composables/useParentAnchor.ts', from)).toBe('/docs/composables/use-parent-anchor')
  })

  it('returns null for a composable without a page', () => {
    expect(rewriteDocsHref('../../../composables/useToast.ts', from)).toBeNull()
  })

  it('returns null for source files that have no page', () => {
    expect(rewriteDocsHref('./Select.vue', from)).toBeNull()
    expect(rewriteDocsHref('../../../assets/css/components/button.css', from)).toBeNull()
  })
})

describe('rewriteBodyLinks', () => {
  it('rewrites nested links and unlinks targets without a page', () => {
    const body = { type: 'minimark', value: [
      ['p', {}, 'See ', ['a', { href: './DESIGN.md' }, 'design'], ' and ', ['a', { href: './Select.vue' }, 'source']],
    ] }
    const out = rewriteBodyLinks(body, 'base/select') as any
    const p = out.value[0]
    expect(p[3][1].href).toBe('/docs/components/select?tab=design')
    expect(p[5][0]).toBe('span')
    expect(p[5][1].href).toBeUndefined()
  })
})
