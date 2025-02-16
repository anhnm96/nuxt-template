<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    loading?: boolean
    loadingMsg?: string
    contentClass?: string
  }>(),
  {
    loading: false,
    loadingMsg: 'processing, wait...',
  },
)
const emit = defineEmits<{
  (e: 'click', ev: MouseEvent): void
}>()

const btnRef = ref<HTMLButtonElement>()
function click(event: MouseEvent) {
  const isBtnDisabled = btnRef.value?.getAttribute('aria-disabled') === 'true'
  if (isBtnDisabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    ref="btnRef"
    class="btn initial:relative"
    :class="[loading && '!pointer-events-none']"
    @click="click"
  >
    <span
      class="flex-center inline-flex initial:gap-1"
      :class="[contentClass, loading && 'invisible']"
    >
      <slot />
    </span>
    <div
      v-if="loading"
      class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
    >
      <span v-if="loadingMsg" class="sr-only" aria-live="assertive">
        {{ loadingMsg }}
      </span>
      <Spinner />
    </div>
  </button>
</template>
