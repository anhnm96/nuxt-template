<script lang="ts" setup>
interface SwitchLabel {
  checked: string
  unchecked: string
}

withDefaults(
  defineProps<{
    label?: SwitchLabel
    activeColor?: string
    inActiveColor?: string
    width?: string
    height?: string
    margin?: string
  }>(),
  {
    activeColor: '#36a829',
    inActiveColor: '#bfcbd9',
    width: '50px',
    height: '24px',
    margin: '4px',
  },
)

const internalValue = defineModel<boolean>({ default: false })
function toggle() {
  return (internalValue.value = !internalValue.value)
}
</script>

<template>
  <button
    role="switch"
    type="button"
    class="toggle-button"
    :aria-pressed="internalValue"
    :style="{
      '--width': width,
      '--height': height,
      '--margin': margin,
      '--active-color': activeColor,
      '--inactive-color': inActiveColor,
    }"
    @click="toggle"
  >
    <template v-if="label">
      <span v-if="internalValue" data-test="label">
        <slot name="checked">
          {{ label.checked }}
        </slot>
      </span>
      <span v-else data-test="label">
        <slot>
          {{ label.unchecked }}
        </slot>
      </span>
    </template>
  </button>
</template>

<style scoped>
.toggle-button {
  display: inline-block;
  position: relative;
  box-sizing: border-box;
  transition: background 0.3s;
  user-select: none;
  width: var(--width);
  height: var(--height);
  border-radius: 999px;
}

.toggle-button:hover,
.toggle-button:focus {
  box-shadow: 0 0 0.5rem var(--inactive-color);
  outline: none;
}

.toggle-button[aria-pressed='true']:hover,
.toggle-button[aria-pressed='true']:focus {
  box-shadow: 0 0 0.5rem var(--active-color);
}

.toggle-button span {
  display: flex;
  height: 100%;
  transform: translate(0);
  align-items: center;
  justify-content: center;
  font-weight: 500;
  color: #fff;
  pointer-events: none;
  font-size: 10px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toggle-button[aria-pressed='false'] span {
  right: 10px;
}

.toggle-button[aria-pressed='true'] span {
  left: 10px;
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
  transition: transform 0.3s;
  border-radius: 100%;
  background-color: #fff;
  height: calc(var(--height) - (2 * var(--margin)));
  aspect-ratio: 1;
}

.toggle-button[aria-pressed='true']::before {
  transform: translate(
    calc(
      var(--width) - var(--height) +
        var(--margin)
    ),
    var(--margin)
  );
}

/* Reduced motion */
@media screen and (prefers-reduced-motion: reduce) {
  .toggle-button,
  .toggle-button::before {
    transition: none;
  }
}

*[dir='rtl'] .toggle-button::before {
  right: 0;
  transform: translate(
    calc(-1 * var(--margin)),
    var(--margin)
  );
}

*[dir='rtl'] .toggle-button[aria-pressed='true']::before {
  transform: translate(
    calc(
      -1 * (var(--width) - var(--height) +
            var(--margin))
    ),
    var(--margin)
  );
}

*[dir='rtl'] .toggle-button[aria-pressed='false'] span {
  left: 10px;
  right: auto;
}

*[dir='rtl'] .toggle-button[aria-pressed='true'] span {
  right: 10px;
  left: auto;
}
</style>
