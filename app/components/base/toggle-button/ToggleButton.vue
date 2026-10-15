<script lang="ts" setup>
import type { ButtonProps } from '~/components/base/button/Button.vue'

const props = defineProps<ButtonProps>()

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const model = defineModel<boolean>({ default: false })

const attrs = useAttrs()

/*
  Coerced, not passed through. A consumer binds state that is owned elsewhere, and
  `editor?.isActive('bold')` is `boolean | undefined`; Vue removes an attribute whose value
  is null or undefined. An unpressed Toggle Button and one that reports no state would then
  look the same and announce differently. See DESIGN.md.
*/
const pressed = computed(() => !!model.value)

/*
  The model is written on every click, and the rendered state still comes from the prop. A
  consumer that binds both `model-value` and the listener stays the source of truth, so a
  command the consumer refuses leaves the button unpressed. ToggleButton.spec.ts pins that.
*/
function click(event: MouseEvent) {
  model.value = !pressed.value
  emit('click', event)
}

/*
  `import.meta.dev` is false under vitest and `import.meta.env.DEV` is the true one, so both
  are tested. Both are compile-time literals, so a production build still drops the block.
*/
if (import.meta.dev || import.meta.env.DEV) {
  // An empty `aria-label` is ignored by a reader, so it is not a name either.
  const supplied = (attribute: unknown) => attribute !== undefined && attribute !== null && String(attribute).trim() !== ''
  const name = () => [props.label, attrs['aria-label'], attrs['aria-labelledby']].find(supplied)

  let announced: unknown

  onMounted(() => {
    announced = name()
    if (!supplied(announced)) {
      console.warn('[ToggleButton] No accessible name. Pass `label`, `aria-label` or `aria-labelledby`. An icon alone names nothing.')
    }
  })

  /*
    attrs is current but does not track, so onUpdated is where a changed name can be seen.
  */
  onUpdated(() => {
    const current = name()
    if (supplied(announced) && supplied(current) && current !== announced) {
      console.warn(`[ToggleButton] The accessible name changed from "${announced}" to "${current}". aria-pressed already reports the state, so a name that moves with it announces the state twice. Keep the name fixed.`)
    }
    announced = current
  })
}
</script>

<template>
  <Button
    v-bind="props"
    :aria-pressed="pressed"
    @click="click"
  >
    <!--
      Forwarded only when the consumer fills it. An always-forwarded slot would count as
      content and would drop Button's own icon fallback.
    -->
    <template v-if="$slots.default" #default>
      <slot />
    </template>
  </Button>
</template>
