<script lang="ts" setup>
const props = withDefaults(
  defineProps<{
    label?: string
    icon?: {
      name: string
      size?: string
      class?: string | string[]
    } | string
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

const btnRef = useTemplateRef('btn')
function click(event: MouseEvent) {
  const isBtnDisabled = btnRef.value?.getAttribute('aria-disabled') === 'true'
  if (isBtnDisabled || props.loading) return
  emit('click', event)
}
</script>

<template>
  <button
    ref="btn"
    class="btn initial:relative"
    :class="[loading && '!pointer-events-none']"
    @click="click"
  >
    <span
      class="flex-center inline-flex initial:gap-1"
      :class="[contentClass, loading && 'invisible']"
    >
      <slot>
        <span v-if="label">{{ label }}</span>
        <template v-if="icon">
          <Icon v-if="typeof icon === 'string'" :name="icon" />
          <Icon v-else :name="icon.name" :size="icon.size || '14'" :class="[label && 'translate-x-1/4', icon.class]" />
        </template>
      </slot>
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
