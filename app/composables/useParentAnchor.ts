/** `true` for the parent element, a CSS selector, or an element. */
export type AnchorTarget = true | string | HTMLElement

/**
 * Resolves the Anchor of a component that renders no element of its own, such as `Tooltip`
 * and `ContextMenu`.
 *
 * Such a component leaves only a placeholder in its parent. The parent of that placeholder is
 * therefore the element that the component was written inside, and `true` resolves to it.
 *
 * The Anchor is `null` until the component mounts. It resolves again when `target` changes.
 * A selector that matches nothing resolves to `null` and logs an error under `componentName`.
 *
 * Call this in `setup`, because it reads the current component instance.
 */
export function useParentAnchor(target: () => AnchorTarget, componentName: string) {
  const instance = getCurrentInstance()!
  const anchorEl = shallowRef<HTMLElement | null>(null)

  function resolveAnchor(): HTMLElement | null {
    const value = target()
    // `parentElement`, because `$el.parentNode` is not always an element.
    if (value === true) return (instance.proxy?.$el as Node | null)?.parentElement ?? null
    if (typeof value !== 'string') return value

    const el = document.querySelector<HTMLElement>(value)
    if (!el) console.error(`[${componentName}] target "${value}" not found`)
    return el
  }

  onMounted(() => {
    anchorEl.value = resolveAnchor()
  })
  watch(target, () => {
    anchorEl.value = resolveAnchor()
  })

  return anchorEl
}
