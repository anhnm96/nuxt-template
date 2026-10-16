<script lang="ts">
export interface IconOption {
  name: string
  size?: string | number
  class?: string | string[]
}

export interface ButtonProps {
  label?: string
  /** Sits before the label, which is where a glyph that restates the action belongs. */
  icon?: IconOption | string
  /** Sits after the label, for an affordance such as a disclosure chevron. */
  trailingIcon?: IconOption | string
  loading?: boolean
  loadingMsg?: string
  contentClass?: string | string[]
}
</script>

<script lang="ts" setup>
const props = withDefaults(defineProps<ButtonProps>(), {
  loading: false,
  loadingMsg: 'processing, wait...',
})

const emit = defineEmits<{ click: [event: MouseEvent] }>()

const attrs = useAttrs()

/**
 * A bare name and an option object reach the template as one shape, so neither icon
 * position has to branch.
 */
function toIconOption(icon?: IconOption | string): IconOption | undefined {
  if (!icon) return undefined
  return typeof icon === 'string' ? { name: icon } : icon
}

const leadingIconOption = computed(() => toIconOption(props.icon))
const trailingIconOption = computed(() => toIconOption(props.trailingIcon))

/*
 * A caller marks the button unavailable with aria-disabled, which keeps it focusable and
 * therefore still fires click; native disabled stops the event before it arrives. Read
 * the attribute at click time: useAttrs is current but does not track, so a computed
 * built on it would go stale.
 *
 * Only "true" counts, because that is what button.css dims with
 * `:not([aria-disabled="true"])`. A bare `aria-disabled` renders as "" and matches
 * neither, so the button stays live rather than looking enabled but ignoring clicks.
 */
function click(event: MouseEvent) {
  const ariaDisabled = attrs['aria-disabled']
  if (props.loading || ariaDisabled === true || ariaDisabled === 'true') return
  emit('click', event)
}
</script>

<template>
  <button
    type="button"
    class="btn initial:relative"
    :class="[loading && 'pointer-events-none!']"
    :aria-busy="loading || undefined"
    @click="click"
  >
    <!--
      The live region stays mounted and empty. A screen reader announces text added to a
      region it already knows about; one inserted with its text already in place is
      commonly missed. While loading, the label below is `invisible`, which takes it out
      of the accessibility tree, so this message becomes the button's accessible name.
    -->
    <span class="sr-only" aria-live="assertive">{{ loading ? loadingMsg : '' }}</span>
    <!-- content: `.btn-swap` and `.btn-swap-out` are the cross, and button.css defines both -->
    <span
      class="btn-swap inline-flex flex-center initial:gap-1"
      :class="[contentClass, loading && 'btn-swap-out invisible']"
    >
      <slot>
        <!--
          Logical margins, never `translate`: translate has no logical form, so it
          reverses under dir="rtl". The negative margin trims the padding on the icon's
          own side, which a `.btn:has()` rule cannot do without knowing each size's
          padding.
        -->
        <Icon
          v-if="leadingIconOption"
          :name="leadingIconOption.name"
          :size="leadingIconOption.size"
          :class="[label && '-ms-1 me-0.5', leadingIconOption.class]"
        />
        <span v-if="label">{{ label }}</span>
        <Icon
          v-if="trailingIconOption"
          :name="trailingIconOption.name"
          :size="trailingIconOption.size"
          :class="[label && 'ms-0.5 -me-1', trailingIconOption.class]"
        />
      </slot>
    </span>
    <!--
      The spinner crosses with the label rather than replacing it on one frame, through the
      same pair of classes the label wears.
    -->
    <Transition
      enter-active-class="btn-swap"
      leave-active-class="btn-swap"
      enter-from-class="btn-swap-out"
      leave-to-class="btn-swap-out"
    >
      <div
        v-if="loading"
        class="absolute top-1/2 left-1/2 -translate-1/2"
      >
        <Spinner />
      </div>
    </Transition>
  </button>
</template>
