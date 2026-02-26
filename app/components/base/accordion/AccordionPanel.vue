<script setup lang="ts">
import { injectAccordionContext, provideAccordionPanelContext } from './context'

const props = defineProps<{ disabled?: boolean, value?: Key }>()

const groupContext = injectAccordionContext({ disabled: false, expandedKeys: null as any, toggleExpanded: () => {} })
const isInsideGroup = !!groupContext.expandedKeys

const triggerId = useId()
const contentId = useId()

const _expanded = defineModel<boolean>('expanded', { default: false })
const expanded = computed(() => isInsideGroup ? groupContext.expandedKeys.value.has(props.value ?? contentId) : _expanded.value)

const panelContentRef = shallowRef<HTMLElement | null>(null)

onMounted(() => {
  const panelContent = panelContentRef.value
  if (!panelContent) return
  if (expanded.value) {
    panelContent.removeAttribute('hidden')
    panelContent.style.setProperty('--accordion-panel-width', 'auto')
    panelContent.style.setProperty('--accordion-panel-height', 'auto')
  } else {
    panelContent.setAttribute('hidden', 'until-found')
    panelContent.style.setProperty('--accordion-panel-width', '0px')
    panelContent.style.setProperty('--accordion-panel-height', '0px')
  }
})

watch(expanded, () => {
  if (!panelContentRef.value) return
  const panelContent = panelContentRef.value

  if (expanded.value) {
    panelContent.removeAttribute('hidden')

    // Set dimensions in px so CSS transition can animate from current size.
    panelContent.style.setProperty('--accordion-panel-width', `${panelContent.scrollWidth}px`)
    panelContent.style.setProperty('--accordion-panel-height', `${panelContent.scrollHeight}px`)

    Promise.all(panelContent.getAnimations().map(a => a.finished))
      .then(() => {
        panelContent.style.setProperty('--accordion-panel-width', 'auto')
        panelContent.style.setProperty('--accordion-panel-height', 'auto')
      })
      .catch(() => {})
  } else {
    panelContent.style.setProperty('--accordion-panel-width', `${panelContent.scrollWidth}px`)
    panelContent.style.setProperty('--accordion-panel-height', `${panelContent.scrollHeight}px`)

    // Force reflow so the transition runs from current size to 0
    void window.getComputedStyle(panelContent).height

    panelContent.style.setProperty('--accordion-panel-width', '0px')
    panelContent.style.setProperty('--accordion-panel-height', '0px')

    Promise.all(panelContent.getAnimations().map(a => a.finished))
      .then(() => panelContent.setAttribute('hidden', 'until-found'))
      .catch(() => {})
  }
})

function toggleExpanded(value?: boolean) {
  if (props.disabled || groupContext.disabled) return

  if (isInsideGroup) {
    groupContext.toggleExpanded(props.value ?? contentId)
  } else {
    _expanded.value = value ?? !_expanded.value
  }
}

provideAccordionPanelContext({
  triggerId,
  contentId,
  panelContentRef,
  expanded,
  toggleExpanded,
  disabled: props.disabled,
})
</script>

<template>
  <div
    class="accordion-panel"
    :data-state="expanded ? 'open' : 'closed'"
    :data-disabled="disabled"
  >
    <slot />
  </div>
</template>
