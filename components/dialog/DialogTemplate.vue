<script setup lang="ts">
defineOptions({
  inheritAttrs: false,
})

defineEmits<{
  afterLeave: []
}>()

const [DefineTemplate, ReuseTemplate] = createReusableTemplate<{ open: boolean, setClose: () => void }>()
</script>

<template>
  <DefineTemplate v-slot="{ open, setClose }">
    <Transition name="overlay" appear @after-leave="setClose();$emit('afterLeave')">
      <div v-if="open" class="fixed inset-0 bg-gray-500 bg-opacity-75" aria-hidden="true" />
    </Transition>

    <Transition name="content" appear>
      <div v-if="open" class="fixed inset-0 z-dialog overflow-y-auto">
        <slot :set-close />
      </div>
    </Transition>
  </DefineTemplate>
  <Dialog v-slot="{ open, setClose }" v-bind="$attrs">
    <template v-if="$slots.trigger">
      <slot name="trigger" />

      <Teleport to="body">
        <ReuseTemplate :open :set-close />
      </Teleport>
    </template>

    <template v-else>
      <ReuseTemplate :open :set-close />
    </template>
  </Dialog>
</template>
