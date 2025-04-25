<script setup lang="ts">
withDefaults(
  defineProps<{
    label?: {
      checked: string
      unchecked: string
    }
    activeColor?: string
    inActiveColor?: string
    height?: string
    margin?: string
  }>(),
  {
    height: '24px',
    margin: '4px',
  },
)

const emit = defineEmits<{
  change: [value: boolean]
}>()

const modelValue = defineModel<boolean>({ default: false })
function toggle() {
  modelValue.value = !modelValue.value
  emit('change', modelValue.value)
}
</script>

<template>
  <button
    role="switch"
    type="button"
    class="toggle-button"
    :aria-pressed="modelValue"
    :style="{
      '--height': height,
      '--margin': margin,
      '--active-color': activeColor || 'var(--color-primary-500)',
      '--inactive-color': inActiveColor || 'var(--color-slate-400)',
    }"
    :title="modelValue ? label?.checked : label?.unchecked"
    @click="toggle"
  >
    <template v-if="label">
      <div class="grid h-full place-items-center overflow-hidden">
        <span
          class="col-start-1 row-start-1"
          :class="[!modelValue && 'opacity-0']"
          :aria-hidden="!modelValue"
        >
          {{ label.checked }}
        </span>
        <span
          class="col-start-1 row-start-1"
          :class="[modelValue && 'opacity-0']"
          :aria-hidden="modelValue"
        >
          {{ label.unchecked }}
        </span>
      </div>
    </template>
  </button>
</template>

<style scoped>
.toggle-button {
  display: inline-block;
  position: relative;
  min-width: 50px;
  height: var(--height);
  border-radius: 999px;
  transition: background 0.3s, box-shadow 0.3s;
  user-select: none;
}

.toggle-button:focus-visible {
  box-shadow: 0 0 0.5rem var(--inactive-color);
  outline: none;
}

.toggle-button[aria-pressed='true']:focus-visible {
  box-shadow: 0 0 0.5rem var(--active-color);
}

.toggle-button span {
  display: flex;
  height: 100%;
  align-items: center;
  font-weight: 500;
  color: #fff;
  pointer-events: none;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-button[aria-pressed='true'] {
  background: var(--active-color);
  padding-inline-start: var(--margin);
  padding-inline-end: var(--height);
}

.toggle-button[aria-pressed='false'] {
  background: var(--inactive-color);
  padding-inline-start: var(--height);
  padding-inline-end: var(--margin);
}

.toggle-button::before {
  content: '';
  position: absolute;
  display: block;
  overflow: hidden;
  top: 0;
  left: 0;
  z-index: 20;
  transform: translate(
    var(--margin),
    var(--margin)
  );
  transition: left 0.3s;
  border-radius: 100%;
  background-color: #fff;
  height: calc(var(--height) - (2 * var(--margin)));
  aspect-ratio: 1;
}

.toggle-button[aria-pressed='true']::before {
  left: calc(100% - var(--height));
}

/* Reduced motion */
@media screen and (prefers-reduced-motion: reduce) {
  .toggle-button,
  .toggle-button::before {
    transition: none;
  }
}

*[dir='rtl'] .toggle-button::before {
  left: auto;
  right: 0;
  transform: translate(
    calc(-1 * var(--margin)),
    var(--margin)
  );
  transition: right 0.3s;
}

*[dir='rtl'] .toggle-button[aria-pressed='true']::before {
  right: calc(100% - var(--height));
}
</style>
