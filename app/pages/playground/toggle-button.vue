<script setup lang="ts">
import ToggleButton from '~/components/base/toggle-button/ToggleButton.vue'

const { copy, copied } = useClipboard()
const { show } = useToast()
watch(copied, (value) => {
  if (value) show({ severity: 'success', description: 'Copied' })
})

/** One row per variant, so the pressed fill can be read against the accent it comes from. */
const variants = [
  'btn-text',
  'btn-text-error',
  'btn-text-info',
  'btn-outline',
  'btn-outline-success',
  'btn-outline-warn',
  'btn-primary',
  'btn-info',
  'btn-warn',
  'btn-neutral',
]

const sizes = [
  { label: '.btn-sm', size: 'btn-sm' },
  { label: '.btn (default)', size: '' },
  { label: '.btn-lg', size: 'btn-lg' },
  { label: '.btn-xl', size: 'btn-xl' },
]

/** Each live button keeps its own state, so a row can be clicked without moving its neighbours. */
const live = reactive<Record<string, boolean>>({})

/** A toolbar in the shape Tiptap.vue uses: icon only, named by aria-label, state held outside. */
const marks = reactive({ bold: false, italic: false, underline: false, strike: false })
const marksIcons = [
  { key: 'bold', label: 'Bold', icon: 'i-fluent:text-bold-16-filled' },
  { key: 'italic', label: 'Italic', icon: 'i-fluent:text-italic-16-filled' },
  { key: 'underline', label: 'Underline', icon: 'i-fluent:text-underline-16-filled' },
  { key: 'strike', label: 'Strikethrough', icon: 'i-fluent:text-strikethrough-16-filled' },
] as const

/*
  The contract tiptap depends on. While `accepted` is false the handler refuses, and a button
  that owned its own state would draw pressed over a command that never ran.
*/
const accepted = ref(false)
const owned = ref(false)
const refusals = ref(0)
function request(next: boolean) {
  if (!accepted.value) {
    refusals.value++
    return
  }
  owned.value = next
}

/** Bound one way on purpose, to show the drift the README names. */
const oneWay = ref(false)

const unnamed = ref(false)
</script>

<template>
  <div class="flex flex-col gap-8 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Pressed fills a ghost variant with its own accent and deepens a solid one
      </h2>
      <div class="grid-table with-label">
        <template v-for="cls in variants" :key="cls">
          <div>
            <button class="w-full text-left" @click="copy(cls)">
              .{{ cls }}
              <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
                {{ copied ? 'Copied!' : 'Copy' }}
              </Tooltip>
            </button>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-4">
              <ToggleButton :class="cls" :model-value="false" label="Unpressed" aria-label="Unpressed sample" />
              <ToggleButton :class="cls" :model-value="true" label="Pressed" aria-label="Pressed sample" />
              <ToggleButton v-model="live[cls]" :class="cls" label="Click me" />
            </div>
          </div>
        </template>
      </div>
      <p class="text-description">
        Hover and active still answer while pressed, because pressing again turns it off.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Every size and every Button prop passes through
      </h2>
      <div class="grid-table with-label">
        <template v-for="row in sizes" :key="row.label">
          <div>
            <button class="w-full text-left" @click="copy(`btn-text ${row.size}`.trim())">
              {{ row.label }}
              <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
                {{ copied ? 'Copied!' : 'Copy' }}
              </Tooltip>
            </button>
          </div>
          <div>
            <div class="flex flex-wrap items-end gap-4">
              <ToggleButton class="btn-text" :class="[row.size]" :model-value="true" label="Text" />
              <ToggleButton class="btn-outline" :class="[row.size]" :model-value="true" label="With icon" icon="ph:check" />
              <ToggleButton class="btn-primary" :class="[row.size]" :model-value="false" label="Unpressed" />
            </div>
          </div>
        </template>

        <div>
          <button class="w-full text-left" @click="copy('btn-text btn-icon')">
            .btn-icon
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-1">
            <ToggleButton
              v-for="mark in marksIcons"
              :key="mark.key"
              v-model="marks[mark.key]"
              class="btn-text btn-icon"
              :aria-label="mark.label"
            >
              <Icon class="text-xl" :name="mark.icon" />
              <Tooltip placement="bottom" class="tooltip-dark">
                {{ mark.label }}
              </Tooltip>
            </ToggleButton>
          </div>
        </div>
      </div>
      <p class="text-description">
        The toolbar row is the shape <code>Tiptap.vue</code> uses: an icon, a Tooltip that
        describes the button, and an <code>aria-label</code> that names it.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A controlling consumer keeps the truth
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <ToggleButton
          class="btn-outline"
          :model-value="owned"
          label="Bold"
          @update:model-value="request"
        />
        <label class="flex items-center gap-2 text-sm">
          <input v-model="accepted" type="checkbox">
          accept the request
        </label>
        <span class="text-description text-sm">
          refused {{ refusals }} time(s) — the button stayed unpressed each time
        </span>
      </div>
      <p class="text-description">
        Bound with <code>:model-value</code> and <code>@update:model-value</code>, the button
        draws only what the consumer gives it. Uncheck the box and it cannot press itself.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        One-way binding drifts, which is why v-model exists
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <ToggleButton class="btn-outline" :model-value="oneWay" label="One way" />
        <ToggleButton v-model="oneWay" class="btn-text" label="v-model" />
        <span class="text-description text-sm">model holds {{ oneWay }}</span>
      </div>
      <p class="text-description">
        The first button has no listener, so its first click falls back to its own state and it
        stops agreeing with the value it was passed. The second one writes the model.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Disabled, and the state it keeps reporting
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <ToggleButton class="btn-outline" :model-value="true" label="aria-disabled" aria-disabled="true" />
        <ToggleButton class="btn-outline" :model-value="true" label="disabled" disabled />
        <ToggleButton class="btn-primary" :model-value="false" label="aria-disabled, off" aria-disabled="true" />
      </div>
      <p class="text-description">
        Both forms block the click, so neither can change the state. Both still carry
        <code>aria-pressed</code>: a disabled toggle has a state, and dropping the attribute
        would announce a plain button.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        An unnamed toggle warns in dev
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <Button class="btn-outline" label="Mount one without a name" @click="unnamed = !unnamed" />
        <ToggleButton v-if="unnamed" class="btn-text btn-icon" icon="ph:check" />
      </div>
      <p class="text-description">
        Open the console. An icon names nothing, a Tooltip describes rather than names, so the
        component asks for <code>label</code>, <code>aria-label</code> or
        <code>aria-labelledby</code>.
      </p>
    </section>
  </div>
</template>
