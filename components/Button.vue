<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    loading?: boolean
    loadingMsg?: string
    contentClass?: string
    hideStatusContent?: boolean
  }>(),
  {
    loading: false,
    loadingMsg: 'processing, wait...',
    success: false,
    hideStatusContent: false,
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
      :class="[
        contentClass,
        !hideStatusContent && loading && 'invisible',
      ]"
    >
      <slot />
    </span>
    <Transition
      v-if="!hideStatusContent && loading"
      name="fade"
      mode="out-in"
    >
      <div
        v-if="loading"
        class="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2"
      >
        <span v-if="loadingMsg" class="sr-only" aria-live="assertive">
          {{ loadingMsg }}
        </span>
        <Spinner />
      </div>
    </Transition>
  </button>
</template>
