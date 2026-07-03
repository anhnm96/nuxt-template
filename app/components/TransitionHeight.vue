<script lang="ts" setup>
defineProps<{ show: boolean }>()
</script>

<template>
  <Transition name="height" appear>
    <div v-if="show" class="grid overflow-hidden">
      <div class="min-h-0">
        <slot />
      </div>
    </div>
  </Transition>
</template>

<style>
.height-enter-from,
.height-leave-to {
  grid-template-rows: 0fr;
}

.height-enter-to,
.height-leave-from {
  grid-template-rows: 1fr;
}

.height-enter-active,
.height-leave-active {
  transition: grid-template-rows 200ms;
}
</style>
