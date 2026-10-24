<script setup lang="ts">
import type { ComponentPublicInstance, CSSProperties } from 'vue'
import type { TooltipGroup, TooltipMember } from './useTooltipGroups'
import { autoUpdate, computePosition, flip, offset, platform, shift } from '@floating-ui/vue'
import { HANDOFF_MS } from './useTooltipGroups'
import { measureTooltipSurface } from './utils'

const props = defineProps<{ group: TooltipGroup }>()
const emit = defineEmits<{ closed: [revision: number], element: [value: HTMLElement | null] }>()
const surface = useTemplateRef('surface')
const positioner = useTemplateRef('positioner')
const reduced = usePreferredReducedMotion()
const position = shallowRef<CSSProperties>({ position: 'fixed', visibility: 'hidden' })
const side = shallowRef('top')
const arrowStyle = shallowRef<CSSProperties>({})
const layers = computed(() => [props.group.previous, props.group.current].filter((member): member is TooltipMember => Boolean(member)))
const contentWidths = shallowReactive(new Map<string, number>())
const options = computed(() => props.group.current?.options())
const closingRevision = shallowRef(0)
let calculation = 0
let positionedRevision = -1

function setTarget(member: TooltipMember, el: Element | ComponentPublicInstance | null) {
  member.target.value = el instanceof HTMLElement ? el : null
}

async function update() {
  const group = props.group
  const member = group.current
  const el = surface.value
  const floating = positioner.value
  const content = member?.target.value
  const anchor = member?.anchor.value
  if (!el || !floating || !content || !anchor || !content.childNodes.length) return
  const serial = ++calculation
  const revision = group.revision
  const settings = member.options()
  const { width, height, contentWidth } = measureTooltipSurface(el, content, settings.attrs.style)
  contentWidths.set(member.id, contentWidth)
  // Position against the destination size, not the interpolated box on screen.
  const result = await computePosition(anchor, floating, {
    strategy: 'fixed',
    placement: settings.placement,
    middleware: [offset(settings.offset), flip(), shift()],
    platform: {
      ...platform,
      getDimensions: element => element === floating
        ? Promise.resolve({ width, height })
        : Promise.resolve({ width: (element as HTMLElement).offsetWidth, height: (element as HTMLElement).offsetHeight }),
    },
  })
  if (serial !== calculation || group.revision !== revision) return
  side.value = result.placement.split('-')[0]!
  const anchorBox = anchor.getBoundingClientRect()
  const verticalSide = side.value === 'top' || side.value === 'bottom'
  const center = verticalSide ? anchorBox.x + anchorBox.width / 2 - result.x : anchorBox.y + anchorBox.height / 2 - result.y
  const arrowOffset = Math.max(4, Math.min(center - 4, (verticalSide ? width : height) - 12))
  const opposite: Record<string, string> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' }
  arrowStyle.value = {
    [verticalSide ? 'left' : 'top']: `${arrowOffset}px`,
    [opposite[side.value]!]: '-4px',
  }
  if (position.value.left === `${result.x}px` && position.value.top === `${result.y}px`
    && position.value.width === `${width}px` && position.value.height === `${height}px`) return
  const morph = positionedRevision !== revision && positionedRevision !== -1 && group.morph && reduced.value !== 'reduce'
  positionedRevision = revision
  position.value = {
    position: 'fixed',
    left: `${result.x}px`,
    top: `${result.y}px`,
    width: `${width}px`,
    height: `${height}px`,
    transition: morph ? `left ${HANDOFF_MS}ms ease-out, top ${HANDOFF_MS}ms ease-out, width ${HANDOFF_MS}ms ease-out, height ${HANDOFF_MS}ms ease-out` : 'none',
  }
}

watchEffect((cleanup) => {
  const anchor = props.group.current?.anchor.value
  const content = props.group.current?.target.value
  const el = positioner.value
  if (!anchor || !content || !el) return
  // The content can change without another activation (translations, async text, etc.).
  const observer = new ResizeObserver(() => {
    void update()
  })
  observer.observe(content)
  // Text can change without changing the dimensions of the pinned content box.
  const mutations = new MutationObserver(() => {
    void update()
  })
  mutations.observe(content, { childList: true, characterData: true, subtree: true })
  const stop = autoUpdate(anchor, el, () => {
    void update()
  }, { elementResize: false })
  cleanup(() => {
    observer.disconnect()
    mutations.disconnect()
    stop()
    calculation++
  })
}, { flush: 'post' })
watch(() => props.group.revision, () => {
  nextTick(update)
}, { flush: 'post' })
watch(layers, (members) => {
  for (const id of contentWidths.keys()) {
    if (!members.some(member => member.id === id)) contentWidths.delete(id)
  }
})
watch(positioner, (el) => {
  emit('element', el)
})
onBeforeUnmount(() => {
  calculation++
  emit('element', null)
})
</script>

<template>
  <div
    ref="positioner"
    class="tooltip-container tooltip-group-positioner hit-area"
    :data-tooltip-group="group.name"
    :style="{ ...position, [`--hit-area-${({ top: 'b', bottom: 't', left: 'r', right: 'l' } as Record<string, string>)[side]}`]: `${-(options?.offset ?? 8)}px` }"
    @pointerenter="group.current?.enter()"
    @pointerleave="group.current?.leave()"
  >
    <Transition
      appear
      :name="reduced === 'reduce' ? 'popover-instant' : options?.animate"
      @before-leave="closingRevision = group.revision"
      @after-leave="emit('closed', closingRevision)"
    >
      <div
        v-show="group.open"
        :id="group.current?.id"
        ref="surface"
        v-bind="options?.attrs"
        role="tooltip"
        class="tooltip tooltip-dark tooltip-group-surface"
        :style="{
          '--trigger-origin': getTransformOrigin(side as Position),
          'width': '100% !important',
          'height': '100% !important',
          'minWidth': '0 !important',
          'maxWidth': 'none !important',
          'minHeight': '0 !important',
          'maxHeight': 'none !important',
        }"
      >
        <span class="tooltip-group-arrow" :data-side="side" :style="arrowStyle" />
        <div class="tooltip-group-viewport">
          <div
            v-for="member in layers"
            :key="member.id"
            :ref="el => setTarget(member, el)"
            class="tooltip-group-content"
            :style="{ width: contentWidths.has(member.id) ? `${contentWidths.get(member.id)}px` : undefined }"
            :class="{ 'tooltip-group-previous': member === group.previous, 'tooltip-group-incoming': member === group.current && group.previous }"
            :aria-hidden="member === group.previous ? true : undefined"
            :inert="member === group.previous ? true : undefined"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style>
.tooltip-group-positioner { box-sizing: border-box; }
@layer components {
  .tooltip-group-surface { width: max-content; max-width: 95vw; height: auto; }
}
.tooltip-group-surface { box-sizing: border-box; position: relative; }
.tooltip-group-viewport { position: relative; overflow: hidden; height: 100%; }
.tooltip-group-content { width: auto; }
.tooltip-group-previous { position: absolute; top: 0; left: 0; pointer-events: none; animation: tooltip-group-out 180ms ease-out both; }
.tooltip-group-incoming { animation: tooltip-group-in 180ms ease-out both; }
.tooltip-group-arrow { position: absolute; width: 8px; height: 8px; background: inherit; border: inherit; transform: rotate(45deg); }
.tooltip-group-arrow[data-side='top'] { border-top: 0; border-left: 0; }
.tooltip-group-arrow[data-side='bottom'] { border-bottom: 0; border-right: 0; }
.tooltip-group-arrow[data-side='left'] { border-bottom: 0; border-left: 0; }
.tooltip-group-arrow[data-side='right'] { border-top: 0; border-right: 0; }
@keyframes tooltip-group-in { from { opacity: 0; } to { opacity: 1; } }
@keyframes tooltip-group-out { from { opacity: 1; } to { opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .tooltip-group-content { animation: none; }
  .tooltip-group-previous { display: none; }
}
</style>
