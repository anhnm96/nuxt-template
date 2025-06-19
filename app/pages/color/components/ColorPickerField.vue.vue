<script lang="ts" setup>
import defu from 'defu'
import Dropdown from '~/components/Dropdown.vue'
import ColorPallette from './ColorPallette.vue'

const props = defineProps<{
  modelValue?: string
  disabled?: boolean
  shouldAllowShortHexCode?: boolean
  shouldHandleIconClicked?: boolean
  shouldPreventSubmitEmptyValue?: boolean
  pt?: {
    preview?: any
    colorPallette?: any
    colorPreview?: any
    input?: any
  }
}>()

const emit = defineEmits<{
  'iconClick': [event: Event]
  'update:modelValue': [v: string | undefined]
}>()

const id = useId()
const rootKey = `color-picker-${id}`
const elementPopupRef = ref()
const inputWrapperRef = ref()
// const { activate, deactivate, addRootElement, removeRootElement } = useFocusLock()

function handleUpdateModelValue(value: string | undefined) {
  const isNotAcceptedEmptyValue = !value && props.shouldPreventSubmitEmptyValue

  if (isNotAcceptedEmptyValue) {
    return
  }

  emit('update:modelValue', value)
}

function handleShowPopup() {
  elementPopupRef.value?.showPopup()
}

function handleClosePopup() {
  elementPopupRef.value?.hidePopup()
  elementPopupRef.value?.destroy()
}

function handleInputFocus() {
  if (!elementPopupRef.value?.isListening) {
    elementPopupRef.value?.init()
  }
}

function handleIconClick(event: Event) {
  handleShowPopup()

  props.shouldHandleIconClicked && emit('iconClick', event)
}

// activate focus lock
async function popupShow() {
  const el = document.querySelector<HTMLElement>(`.color-picker-${id}`)

  // if (!el) {
  //   return
  // }

  // addRootElement(el, rootKey)
  // activate()
}

// remove focus lock
function popupHide() {
  // removeRootElement(rootKey)
  // deactivate()
}

async function handleKeydown(event: KeyboardEvent) {
  // escape key, hide popup
  if (event.code === 'Escape' && elementPopupRef.value?.isPopoverVisible) {
    event.stopImmediatePropagation()

    if (!elementPopupRef.value?.isMainElementFocusedIn) {
      inputWrapperRef.value?.focus()
      await sleep(50)
    }

    elementPopupRef.value?.hidePopup()

    return
  }

  // arrow down key, show popup
  if (event.code === 'ArrowDown' && elementPopupRef.value?.isMainElementFocusedIn) {
    if (elementPopupRef.value?.isPopoverVisible) {
      // popup is already visible, focus on popup element
      const colorPicker = document.querySelector(`.color-picker-${id}`)

      colorPicker?.getElementsByTagName('button')[0]?.focus()
    } else {
      // popup is not visible, show popup
      elementPopupRef.value?.showPopup()
    }
  }
}
</script>

<template>
  <Dropdown
    ref="elementPopupRef"
    @focus-changed="handleShowPopup"
    @focused-out="handleClosePopup"
    @keydown="handleKeydown"
  >
    <InputWrapper
      ref="inputWrapperRef"
      icon="oui:color"
      :model-value="modelValue"
      :clearable="shouldPreventSubmitEmptyValue ? false : undefined"
      :disabled="disabled"
      :pt="defu(pt?.input, {
        icon: disabled ? '' : 'cursor-pointer',
        input: {
          readonly: true,
          onfocus: handleInputFocus,
        },
      })"
      :style="{ '--preview-color': modelValue }"
      :action-icon="pt?.preview
        ? getPtValue(pt, 'preview')
        : modelValue
          ? `size-4 rounded-3 bg-[--preview-color]`
          : 'size-4 text-5.6 b-abd rounded-3 b bg-checkerboard'"
      @update:model-value="handleUpdateModelValue"
      @action="handleIconClick"
      @icon-click="handleShowPopup"
    />
    <template #popover>
      <ColorPallette
        :model-value="modelValue"
        :disabled
        :should-allow-short-hex-code="shouldAllowShortHexCode"
        :class="[`color-picker-${id}`]"
        v-bind="getPtValue(pt, 'colorPallette')"
        @update:model-value="handleUpdateModelValue"
        @vue:mounted="popupShow"
        @vue:before-unmount="popupHide"
        @close="handleClosePopup"
      />
    </template>
  </Dropdown>
</template>
