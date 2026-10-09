<script setup lang="ts">
import type { Placement, VirtualElement } from '@floating-ui/vue'
import { autoUpdate, flip, offset as floatingOffset, shift, useFloating } from '@floating-ui/vue'
import Menu from '~/components/base/menu/Menu.vue'
import { getCursorRect } from '~/components/base/tooltip/useCursorAnchor'

/**
 * A Menu summoned by right-click on its Anchor.
 *
 * Shaped like `Tooltip`, not like `Dropdown`: it renders no element of its own, finds its
 * Anchor from the element it was written inside, and owns its own floating/teleport. A
 * context menu opens at a point, and `Dropdown` positions against a trigger element it also
 * requires — neither of which a right-click gives us. See ADR-0009.
 */
const props = withDefaults(defineProps<{
  /** The Anchor: `true` for the parent element, a CSS selector, or an element. */
  target?: true | string | HTMLElement
  /**
   * Position at the pointer rather than against the Anchor's box. Falls back to the Anchor
   * when the Menu was opened without coordinates, as the keyboard does.
   * @defaultValue true
   */
  atCursor?: boolean
  placement?: Placement
  offset?: number
  /** Never opens. Dismissal still works, so disabling mid-interaction cannot strand it. */
  disabled?: boolean
  /** Names the Menu for a screen reader. Give this or `labelledBy`. */
  label?: string
  labelledBy?: string
}>(), {
  target: true,
  atCursor: true,
  placement: 'bottom-start',
  offset: 4,
})

const isOpen = defineModel<boolean>('open', { default: false })

// ─── Anchor ─────────────────────────────────────────────────────────────────

const instance = getCurrentInstance()!
const anchorEl = shallowRef<HTMLElement | null>(null)

/**
 * Mirrors `Tooltip.client.vue`'s own resolver rather than the `useAnchor` composable: that
 * one is only used by the superseded `Tooltip2.vue`, and reads `$el.parentNode`, which is
 * not always an element.
 */
function resolveAnchor(): HTMLElement | null {
  const { target } = props
  // The component renders no element of its own, only a placeholder in its parent, so the
  // placeholder's parent is the element it was written inside.
  if (target === true) return (instance.proxy?.$el as Node | null)?.parentElement ?? null
  if (typeof target !== 'string') return target

  const el = document.querySelector<HTMLElement>(target)
  if (!el) console.error(`[ContextMenu] target "${target}" not found`)
  return el
}

// ─── Position ───────────────────────────────────────────────────────────────

/** Frozen at the moment of the right-click: a context menu must not follow the cursor. */
const point = reactive({ x: 0, y: 0 })
const hasPoint = shallowRef(false)

/**
 * `getCursorRect` with `follow: true` collapses to a zero-size rect at the point, which is
 * all floating-ui needs. Taken from `useCursorAnchor`, but not the composable around it —
 * that subscribes to `mousemove` to *track* the cursor, which is the opposite of this.
 */
const cursorEl: VirtualElement = {
  getBoundingClientRect: () => getCursorRect(point, true),
  // Lets autoUpdate observe the Anchor's scroll ancestors, resizes and moves.
  get contextElement() {
    return anchorEl.value ?? undefined
  },
}

const reference = computed(() =>
  props.atCursor && hasPoint.value ? cursorEl : anchorEl.value)

const popoverEl = useTemplateRef<HTMLElement>('popoverEl')
const { floatingStyles, placement: resolvedPlacement, update } = useFloating(reference, popoverEl, {
  placement: () => props.placement,
  middleware: [floatingOffset(() => props.offset), flip(), shift()],
  whileElementsMounted: autoUpdate,
})

// ─── Open / close ───────────────────────────────────────────────────────────

const menuRef = useTemplateRef<InstanceType<typeof Menu>>('menuRef')
let lastFocusedElement: HTMLElement | null = null

/**
 * Set by `open()` so the `isOpen` watcher can tell an open it drove from one it did not —
 * a consumer writing `v-model:open` reaches `isOpen` without passing through here. Mirrors
 * `useSelect`'s `openWasHandled`.
 */
let openWasHandled = false

function open(coords?: { x: number, y: number }) {
  if (props.disabled) return
  if (coords) {
    point.x = coords.x
    point.y = coords.y
  }
  hasPoint.value = coords !== undefined

  if (isOpen.value) {
    // Already open on this Anchor, so `isOpen` does not change and nothing re-measures:
    // `useFloating` watches the reference *object*, and the cursor's virtual element keeps
    // its identity across points. Ask it to measure the new one.
    //
    // `lastFocusedElement` is deliberately left alone. Focus is inside the Menu by now, so
    // capturing it would aim the restore-on-close at a row that is about to unmount.
    update()
    return
  }

  lastFocusedElement = document.activeElement as HTMLElement | null
  openWasHandled = true
  isOpen.value = true
}

function dismiss() {
  isOpen.value = false
}

/**
 * Set by the keyboard gesture so the `contextmenu` event it produces can be told apart
 * from a right-click. A keyboard summon carries no usable pointer position — browsers
 * report the focused element's corner, or zeroes — so it must anchor to the Anchor's box.
 */
let keyboardSummon = false

function handleContextMenu(event: MouseEvent) {
  const fromKeyboard = keyboardSummon
  keyboardSummon = false
  if (props.disabled) return
  // Replaces the browser's own menu; without this both would show.
  event.preventDefault()
  // Firefox fires this *after* the keyboard gesture as well, where cancelling the keydown
  // does not suppress its menu. The keydown has already opened against the Anchor's box,
  // so cancelling here is the whole job: re-opening at this event's coordinates would
  // yank the Menu to the corner, since a keyboard summon reports none worth having.
  if (fromKeyboard) return
  open({ x: event.clientX, y: event.clientY })
}

/**
 * `Shift`+`F10` and the dedicated context-menu key, which is how the keyboard asks for this
 * menu. Both arrive without coordinates, so the Menu anchors to the Anchor's box instead.
 * Only reachable when the Anchor or something inside it holds focus.
 *
 * Cancelling the keydown is enough for Chrome. Firefox goes on to fire a `contextmenu`
 * event and shows its own menu anyway, so the flag marks that one as already handled.
 */
function handleAnchorKeydown(event: KeyboardEvent) {
  if (event.key !== 'ContextMenu' && !(event.key === 'F10' && event.shiftKey)) return
  // Checked before the cancel, as `handleContextMenu` does. A disabled ContextMenu leaves
  // the browser's own menu alone; cancelling here and then opening nothing would take the
  // gesture away from the keyboard while the pointer keeps it.
  if (props.disabled) return
  event.preventDefault()
  keyboardSummon = true
  open()
}

/**
 * Chrome never sends the follow-up `contextmenu`, so the flag can outlive its gesture. A
 * pointer press is the moment that stops mattering: whatever came before, the next
 * `contextmenu` belongs to this press and must anchor to it.
 *
 * Clearing it on a timer instead would be a race against however long the browser takes
 * to turn the keydown into a `contextmenu`.
 */
function handleAnchorPointerDown() {
  keyboardSummon = false
}

watch(anchorEl, (el, previous) => {
  previous?.removeEventListener('contextmenu', handleContextMenu)
  previous?.removeEventListener('keydown', handleAnchorKeydown)
  previous?.removeEventListener('pointerdown', handleAnchorPointerDown)
  el?.addEventListener('contextmenu', handleContextMenu)
  el?.addEventListener('keydown', handleAnchorKeydown)
  el?.addEventListener('pointerdown', handleAnchorPointerDown)
})

onMounted(() => {
  anchorEl.value = resolveAnchor()
})
watch(() => props.target, () => {
  anchorEl.value = resolveAnchor()
})
onBeforeUnmount(() => {
  anchorEl.value?.removeEventListener('contextmenu', handleContextMenu)
  anchorEl.value?.removeEventListener('keydown', handleAnchorKeydown)
  anchorEl.value?.removeEventListener('pointerdown', handleAnchorPointerDown)
})

/**
 * A right-click elsewhere closes this Menu; the other Anchor's own handler then opens its
 * own. `click` alone cannot do this, because a secondary button never fires one — which is
 * why `v-click-outside` is not enough on its own here.
 */
useEventListener(document, 'contextmenu', (event: MouseEvent) => {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (!target) return
  if (anchorEl.value?.contains(target) || popoverEl.value?.contains(target)) return
  dismiss()
})

/**
 * Unlike `Calendar` (ADR-0005: "opening a popover over a control is not a request for
 * focus"), a context menu *is* the request — there is no competing input to protect, and a
 * keyboard user who pressed the context-menu key has nowhere else to go.
 */
watch(isOpen, async (value) => {
  if (value) {
    if (!openWasHandled) {
      // Opened straight through `v-model:open` rather than by a gesture. There are no
      // coordinates behind it, so anchor to the Anchor's box instead of to whatever point
      // the last right-click happened to leave behind, and capture focus from here so the
      // restore on close still has somewhere to go.
      hasPoint.value = false
      lastFocusedElement = document.activeElement as HTMLElement | null
    }
    await nextTick()
    menuRef.value?.focus()
    return
  }
  openWasHandled = false
  // The focused item is gone; put the user back where they were.
  const active = document.activeElement
  if (!active || active === document.body || popoverEl.value?.contains(active)) {
    lastFocusedElement?.focus()
  }
})

function handlePopoverKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  event.stopImmediatePropagation()
  dismiss()
}

// Keep the teleport mounted until the leave transition finishes.
const isMounted = shallowRef(false)
watch(isOpen, (value) => {
  if (value) isMounted.value = true
}, { immediate: true })

function handleAfterLeave() {
  if (!isOpen.value) isMounted.value = false
}

providePopoverContext({ dismiss })

defineExpose({
  open,
  dismiss,
})
</script>

<template>
  <Teleport v-if="isMounted" to=".popovers">
    <div
      ref="popoverEl"
      class="z-(--popover)"
      :style="{ ...floatingStyles, '--trigger-origin': getTransformOrigin(resolvedPlacement) }"
      @keydown="handlePopoverKeydown"
    >
      <Transition name="popover" appear @after-leave="handleAfterLeave">
        <div
          v-if="isOpen"
          v-click-outside="dismiss"
          class="popover"
          data-slot="context-menu"
        >
          <Menu ref="menuRef" :label="label" :labelled-by="labelledBy">
            <slot />
          </Menu>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>
