<script setup lang="ts">
import type { Placement } from '@floating-ui/vue'
import { flip, offset, shift, useFloating } from '@floating-ui/vue'

type TriggerType = 'click' | 'focus' | 'hover' | 'touch'

defineOptions({ inheritAttrs: false })
const props = withDefaults(defineProps<{
  placement?: Placement
  triggers?: TriggerType[]
  offset?: number
}>(), {
  placement: 'bottom',
  triggers: () => (['click']),
  offset: 4,
})

const id = useId()
const isOpen = defineModel('open', {
  type: Boolean,
  default: false,
})

const dropdown = shallowRef()
const popover = shallowRef()
const { floatingStyles } = useFloating(dropdown, popover, {
  placement: props.placement,
  middleware: [flip(), shift(), offset(props.offset)],
})

function toggleShow(value?: boolean) {
  isOpen.value = value ?? !isOpen.value
}

const dropdownProps = {
  onClick: props.triggers.includes('click')
    ? () => toggleShow()
    : undefined,
}

onMounted(() => {
  dropdown.value = document.querySelector(`#${id}__dropdown`)
})
</script>

<template>
  <!-- dropdown -->
  <div ref="dropdown" class="inline-flex" v-bind="dropdownProps">
    <slot />
  </div>
  <!-- popover -->
  <Transition name="fade">
    <div
      v-if="isOpen"
      v-bind="$attrs" ref="popover"
      v-click-outside="() => toggleShow(false)"
      :style="floatingStyles" class="popover"
    >
      <slot name="popover" v-bind="{ toggleShow }" />
    </div>
  </Transition>
</template>
