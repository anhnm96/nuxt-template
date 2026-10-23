<script setup lang="ts">
import type { CursorFollow } from './useCursorAnchor'
import type { TooltipGroup, TooltipMember } from './useTooltipGroups'
import { arrow, autoUpdate, flip, offset, shift, useFloating } from '@floating-ui/vue'
import { useCursorAnchor } from './useCursorAnchor'
import { HANDOFF_WAIT_MS, useTooltipGroups } from './useTooltipGroups'
import { preventNextClick, useTouchPress } from './useTouchPress'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  /** The Anchor: `true` for the parent element, a CSS selector, or an element. */
  target?: true | string | HTMLElement
  /** Opt into a shared moving surface for ordinary tooltips attached to body. */
  group?: string
  /** Teleport destination; empty renders in place. */
  attachTo?: string
  placement?: 'top' | 'bottom' | 'left' | 'right'
  /** Vue transition name. */
  animate?: string
  /** Hover/focus show delay in ms. A Tap and `v-model` open immediately. */
  delay?: number
  hideDelay?: number
  /** Gap between the Anchor and the tooltip, in px. */
  offset?: number
  /**
   * Never shows (and hides if already visible) — e.g. while the Anchor is
   * being dragged.
   */
  disabled?: boolean
  /**
   * Positions against the cursor instead of the Anchor, tracking it while hovering.
   *   true — follows both axes, floating freely with the cursor
   *   'x'  — slides horizontally, pinned to the Anchor's top/bottom edge
   *   'y'  — slides vertically, pinned to the Anchor's left/right edge
   * Ignored on an interactive tooltip, which must stay reachable.
   */
  followCursor?: CursorFollow
  /**
   * An Interactive Tooltip: may hold buttons, and is a preview rather than a
   * description of the Anchor. On touch, a Tap opens it *instead of*
   * activating the Anchor, and it stays open until a second Tap, a tap
   * outside, a drag of the Anchor, Escape, or the slot's `hide()`.
   * Mouse and touch only — keep every action reachable through the Anchor.
   * Never combine with `followCursor`.
   */
  interactive?: boolean
}>(), {
  target: true,
  attachTo: 'body',
  delay: 80,
  hideDelay: 0,
  placement: 'top',
  animate: 'tooltip',
  offset: 8,
})

/** Whether the tooltip is mounted. Stays true through the leave transition. */
const modelValue = defineModel<boolean>()
/** Whether the tooltip is showing; its fall drives the leave transition. */
const isVisible = ref(false)

/**
 * Whether this open is part of a Sweep, and so skips its animation as well as its delay.
 *
 * Set before `isVisible` rises, and kept through the leave: the leave has to match the
 * enter it is undoing. Reset on the next `show`, not on hide.
 */
const isInstant = ref(false)

/**
 * The transition this open uses. A consumer that named its own `animate` keeps it: only the
 * default is swapped, because `tooltip-instant` is the no-animation twin of `tooltip` alone.
 */
const transitionName = computed(() => (
  isInstant.value && props.animate === 'tooltip' ? 'tooltip-instant' : props.animate
))

const tooltipStore = useTooltipStore()
const tooltipId = useId()
const tooltipEl = useTemplateRef('tooltipEl')
const arrowEl = useTemplateRef('arrowEl')
const groups = useTooltipGroups()
const attrs = useAttrs()
const reducedMotion = usePreferredReducedMotion()
const groupTarget = shallowRef<HTMLElement | null>(null)
const activeGroup = shallowRef<TooltipGroup | null>(null)
const canGroup = computed(() => Boolean(props.group) && !props.interactive && !props.followCursor && props.attachTo === 'body' && groups.hosts.value > 0)
const hitElement = computed(() => activeGroup.value?.element.value ?? tooltipEl.value)
let touchOpen = false

if (import.meta.env.DEV) {
  watchEffect(() => {
    if (props.interactive && props.followCursor)
      console.warn('[Tooltip] `followCursor` is ignored on an interactive tooltip: a tooltip under the cursor cannot be clicked.')
    if (props.group && (props.interactive || props.followCursor || props.attachTo !== 'body'))
      console.warn('[Tooltip] `group` requires a non-interactive, element-anchored tooltip attached to body; using standalone rendering.')
  })
}

// ─── Anchor ─────────────────────────────────────────────────────────────────

const instance = getCurrentInstance()!
const anchorEl = shallowRef<HTMLElement | null>(null)
let showTimeout: ReturnType<typeof setTimeout> | undefined
let hideTimeout: ReturnType<typeof setTimeout> | undefined
const member: TooltipMember = {
  id: tooltipId,
  anchor: anchorEl,
  target: groupTarget,
  options: () => ({ placement: props.placement, offset: props.offset, animate: transitionName.value, attrs }),
  deactivate() {
    clearTimeout(showTimeout)
    clearTimeout(hideTimeout)
    showTimeout = undefined
    hideTimeout = undefined
    isVisible.value = false
    tooltipStore.removeTooltip(tooltipId)
    anchorEl.value?.removeAttribute('aria-describedby')
  },
  finish() {
    if (isVisible.value) return
    groupTarget.value = null
    activeGroup.value = null
    modelValue.value = false
  },
  enter() {
    clearTimeout(hideTimeout)
    hideTimeout = undefined
  },
  leave: () => hide(),
}

function resolveAnchor(): HTMLElement | null {
  const { target } = props
  // the component renders no element of its own — only a placeholder in its
  // parent — so the placeholder's parent is the element it was written inside
  if (target === true) return (instance.proxy?.$el as Node | null)?.parentElement ?? null
  if (typeof target !== 'string') return target

  const el = document.querySelector<HTMLElement>(target)
  if (!el) console.error(`[Tooltip] target "${target}" not found`)
  return el
}

onMounted(() => {
  anchorEl.value = resolveAnchor()
})
watch(() => props.target, () => {
  anchorEl.value = resolveAnchor()
})

watchEffect((cleanup) => {
  const anchor = anchorEl.value
  if (!activeGroup.value || !isVisible.value || !anchor) return
  const dismissDetachedAnchor = () => {
    if (!anchor.isConnected) hide(true)
  }
  const observer = new MutationObserver(dismissDetachedAnchor)
  observer.observe(anchor.ownerDocument, { childList: true, subtree: true })
  dismissDetachedAnchor()
  cleanup(() => observer.disconnect())
})

function isInside(el: HTMLElement | null | undefined, node: EventTarget | null) {
  return Boolean(el && node instanceof Node && el.contains(node))
}

// ─── Cursor ─────────────────────────────────────────────────────────────────

const followsCursor = computed(() => (props.interactive ? false : props.followCursor))

// `hasCursor` is false until a pointer has given us coordinates — a
// keyboard/programmatic open falls back to anchoring on the element itself
const { cursorEl, hasCursor, moves, track, untrack } = useCursorAnchor(anchorEl, () => followsCursor.value)

function trackCursor(event?: MouseEvent, isReopening = false) {
  // an open with no pointer coordinates (focus, v-model) anchors instead — a
  // pending hide means the previous pointer's cycle is already over
  if (!track(event) && (!isVisible.value || isReopening)) hasCursor.value = false
}

// ─── Open / close lifecycle ─────────────────────────────────────────────────

function show({ event, immediate = false }: { event?: MouseEvent | PointerEvent, immediate?: boolean } = {}) {
  if (props.disabled) return

  const isReopening = hideTimeout !== undefined
  clearTimeout(hideTimeout)
  hideTimeout = undefined

  // start tracking before the show delay elapses so the first paint lands on
  // the cursor's current position, not where it entered the Anchor
  if (followsCursor.value) trackCursor(event, isReopening)

  if (isVisible.value || showTimeout) return

  // A Sweep owes the next Tooltip neither a delay nor an entrance. A touch press and a
  // focus are excluded; see DESIGN.md, "Sweeping skips the delay and the animation".
  const isPointerDriven = event !== undefined
  const isTouch = isPointerDriven && 'pointerType' in event && event.pointerType === 'touch'
  touchOpen = isTouch
  const isSweeping = isPointerDriven && !isTouch && tooltipStore.isContinuingSweep()
  const isHandoff = isPointerDriven && !isTouch && canGroup.value && groups.groups.has(props.group!)
  if (immediate || isSweeping || isHandoff) {
    // `immediate` is a Tap or a `v-model` open, which keep their animation.
    isInstant.value = !immediate && isSweeping
    reveal()
    return
  }
  isInstant.value = false
  showTimeout = setTimeout(reveal, props.delay)
}

function reveal() {
  showTimeout = undefined
  modelValue.value = true
  isVisible.value = true
  if (canGroup.value) {
    activeGroup.value = groups.activate(props.group!, member, !touchOpen && reducedMotion.value !== 'reduce')
  }
  tooltipStore.addTooltip(tooltipId)
  // an Interactive Tooltip is a preview, not a description of the Anchor
  if (!props.interactive) anchorEl.value?.setAttribute('aria-describedby', tooltipId)
}

function hide(immediate = false) {
  clearTimeout(showTimeout)
  showTimeout = undefined
  untrack()

  const closeGroupImmediately = immediate && Boolean(activeGroup.value)
  if (isVisible.value && (closeGroupImmediately || !hideTimeout)) {
    // Before the timer, not inside `conceal` — see DESIGN.md, "Sweeping skips the delay".
    tooltipStore.markClosing()
    clearTimeout(hideTimeout)
    if (closeGroupImmediately) conceal()
    else hideTimeout = setTimeout(conceal, activeGroup.value && !touchOpen ? Math.max(HANDOFF_WAIT_MS, props.hideDelay) : props.hideDelay)
  }
}

function conceal() {
  hideTimeout = undefined
  isVisible.value = false
  if (activeGroup.value) groups.close(activeGroup.value, member)
  tooltipStore.removeTooltip(tooltipId)
  anchorEl.value?.removeAttribute('aria-describedby')
}

function toggle() {
  // a tooltip with a hide pending is already closing — toggling reopens it
  if (isVisible.value && hideTimeout === undefined) hide()
  else show({ immediate: true })
}

// v-model opens and closes alongside the Anchor's own listeners
watch(modelValue, (value) => {
  if (value) show({ immediate: true })
  else if (value === false) hide(true)
})

watch(() => props.disabled, (value) => {
  if (value) hide(true)
})

watch([canGroup, () => props.group], () => {
  if (activeGroup.value) {
    member.deactivate()
    groups.remove(activeGroup.value, member)
  }
})

onBeforeUnmount(() => {
  if (activeGroup.value) {
    member.deactivate()
    groups.remove(activeGroup.value, member)
  }
  clearTimeout(showTimeout)
  clearTimeout(hideTimeout)
  tooltipStore.removeTooltip(tooltipId)
  anchorEl.value?.removeAttribute('aria-describedby')
})

// ─── Mouse & focus ──────────────────────────────────────────────────────────
// Touch produces pointerenter/leave too; touch has its own policy below.

useEventListener(anchorEl, 'pointerenter', (event: PointerEvent) => {
  if (event.pointerType !== 'touch') show({ event })
}, { passive: true })

useEventListener(anchorEl, 'pointerleave', (event: PointerEvent) => {
  if (event.pointerType !== 'touch' && !isInside(hitElement.value, event.relatedTarget)) hide()
}, { passive: true })

function handleTooltipPointerLeave(event: PointerEvent) {
  if (event.pointerType !== 'touch' && !isInside(anchorEl.value, event.relatedTarget)) hide()
}

// set while a press that started inside the tooltip is down
let isPressingInside = false

useEventListener(anchorEl, 'focus', () => show())
useEventListener(anchorEl, 'blur', (event: FocusEvent) => {
  // pressing a button inside an Interactive Tooltip may take focus from the Anchor
  if (props.interactive && (isPressingInside || isInside(tooltipEl.value, event.relatedTarget))) return
  hide()
})

// activating the Anchor (e.g. opening what it edits) dismisses its tooltip.
// Capture phase, so a child that stops the click can't keep it open — or leave
// a focus-started show pending. A Tap on an interactive Anchor never gets
// here: its click is cancelled at the window.
useEventListener(anchorEl, 'click', () => hide(true), { capture: true, passive: true })

// ─── Touch ──────────────────────────────────────────────────────────────────
// A plain Tooltip peeks while pressed and never blocks the Anchor's own tap.
// An Interactive Tooltip is opened by a Tap, which replaces the Anchor's tap.

useTouchPress(anchorEl, {
  onPress(event) {
    if (!props.interactive) show({ event })
  },
  onTap() {
    if (!props.interactive) {
      hide()
      return
    }
    if (props.disabled) return
    if (anchorEl.value) preventNextClick(anchorEl.value)
    toggle()
  },
  // a drag of the Anchor (or a browser scroll that started on it) dismisses
  onAbort: () => hide(true),
})

// ─── Dismissal while open ───────────────────────────────────────────────────

useEventListener(() => (isVisible.value ? document : null), 'keydown', (event: KeyboardEvent) => {
  if (event.key !== 'Escape') return
  event.stopImmediatePropagation()
  hide(true)
})

// any press outside the Anchor and the tooltip closes an Interactive Tooltip
// — and still does whatever it would have done
useEventListener(() => (isVisible.value && props.interactive ? document : null), 'pointerdown', (event: PointerEvent) => {
  isPressingInside = isInside(tooltipEl.value, event.target)
  if (!isPressingInside && !isInside(anchorEl.value, event.target)) hide()
}, { capture: true, passive: true })

// a touch-scroll inside the tooltip ends in pointercancel, not pointerup
useEventListener(() => (isVisible.value && props.interactive ? document : null), ['pointerup', 'pointercancel'], () => {
  isPressingInside = false
}, { capture: true, passive: true })

// ─── Positioning ────────────────────────────────────────────────────────────

const tracksCursor = computed(() => Boolean(followsCursor.value) && hasCursor.value)
// the free-floating variant sits under the cursor, so it must not capture the
// mousemove events that drive the tracking. the axis-locked variants stay pinned
// to the Anchor's edge like an ordinary tooltip, so they keep the hit area and
// remain hoverable.
const floatsFreely = computed(() => followsCursor.value === true && hasCursor.value)
const reference = computed(() => (tracksCursor.value ? cursorEl : anchorEl.value))

const { floatingStyles, placement, middlewareData, update } = useFloating(reference, tooltipEl, {
  placement: () => props.placement,
  middleware: [offset(props.offset), flip(), shift(), arrow({ element: arrowEl })],
  whileElementsMounted: autoUpdate,
})

// the composable throttles the cursor to one move per frame; reposition on each
watch(moves, () => update(), { flush: 'sync' })

const side = computed(() => placement.value.split('-')[0] as Position)

// bridges the offset gap so the pointer can travel from the Anchor into the tooltip
const hitAreaVar = computed(() => {
  // a free-floating tooltip is never hovered into — it stays out of the way
  if (floatsFreely.value) return {}

  const varMap = { top: '--hit-area-b', bottom: '--hit-area-t', left: '--hit-area-r', right: '--hit-area-l' } as const
  return { [varMap[side.value]]: `${-props.offset}px` }
})

// ─── Arrow ──────────────────────────────────────────────────────────────────

const ARROW_W = 8
const ARROW_H = 5

const arrowConfig = computed(() => {
  const { x = 0, y = 0 } = middlewareData.value.arrow ?? {}
  const s = side.value
  const isVertical = s === 'top' || s === 'bottom'
  const w = isVertical ? ARROW_W : ARROW_H
  const h = isVertical ? ARROW_H : ARROW_W

  // open paths (no Z) — fill auto-closes for the triangle, stroke only draws the 2 visible edges
  const pathMap = {
    top: `M0 0 L${ARROW_W / 2} ${ARROW_H} L${ARROW_W} 0`,
    bottom: `M0 ${ARROW_H} L${ARROW_W / 2} 0 L${ARROW_W} ${ARROW_H}`,
    left: `M0 0 L${ARROW_H} ${ARROW_W / 2} L0 ${ARROW_W}`,
    right: `M${ARROW_H} 0 L0 ${ARROW_W / 2} L${ARROW_H} ${ARROW_W}`,
  }

  // 1px overlap with tooltip body to hide the border seam at the connection
  const edge = `${-(ARROW_H - 1)}px`
  const positionMap = {
    top: { left: `${x}px`, bottom: edge },
    bottom: { left: `${x}px`, top: edge },
    left: { right: edge, top: `${y}px` },
    right: { left: edge, top: `${y}px` },
  }

  return {
    viewBox: `0 0 ${w} ${h}`,
    d: pathMap[s],
    width: w,
    height: h,
    style: { position: 'absolute' as const, ...positionMap[s] },
  }
})
</script>

<template>
  <Teleport v-if="activeGroup && groupTarget" :to="groupTarget">
    <slot :hide="() => hide(true)" />
  </Teleport>
  <Teleport v-else-if="modelValue && !activeGroup" :disabled="!attachTo" :to="attachTo || 'body'">
    <div
      ref="tooltipEl"
      class="tooltip-container"
      :class="floatsFreely ? 'tooltip-follow-cursor' : 'hit-area'"
      :style="{ ...floatingStyles, ...hitAreaVar }"
      @pointerleave="handleTooltipPointerLeave"
    >
      <Transition appear :name="transitionName" @after-leave="isVisible || (modelValue = false)">
        <div v-if="isVisible" :style="{ '--trigger-origin': getTransformOrigin(placement) }">
          <span ref="arrowEl" class="arrow" :style="arrowConfig.style">
            <svg :width="arrowConfig.width" :height="arrowConfig.height" :viewBox="arrowConfig.viewBox">
              <path :d="arrowConfig.d" />
            </svg>
          </span>
          <div
            :id="tooltipId"
            :role="interactive ? undefined : 'tooltip'"
            v-bind="$attrs"
            class="tooltip tooltip-dark"
          >
            <slot :hide />
          </div>
        </div>
      </Transition>
    </div>
  </Teleport>
</template>

<style>
.tooltip-container {
  z-index: 9000;
  max-width: 95vw;
  max-height: 65vh;
  will-change: auto;
  overflow-wrap: break-word;
  white-space: pre-line;
}

/* must not swallow the mousemove events that drive the cursor tracking */
.tooltip-follow-cursor {
  pointer-events: none;
}

.tooltip {
  padding: 6px 10px;
}

.tooltip-dark {
  background-color: var(--color-surface);
  font-size: 12px;
  border-radius: 6px;
  box-shadow: light-dark(
    0 12px 32px color-mix(in srgb, var(--color-slate-900) 18%, transparent),
    0 12px 32px color-mix(in srgb, var(--color-slate-950) 54%, transparent));
  border: 1px solid var(--color-elevated);
}

.tooltip-container .arrow path {
  fill: var(--color-surface);
  stroke: var(--color-elevated);
  stroke-width: 1;
}
</style>
