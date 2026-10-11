<script setup lang="ts">
import Switch from '~/components/base/switch/Switch.vue'

const id = useId()

const plain = ref(false)
const medium = ref(false)
const fixedWidth = ref(false)
const unnamed = ref(false)
const readout = ref(true)
const small = ref(true)
const large = ref(true)
const themed = ref(true)
const failed = ref(true)
const wide = ref(false)
const rtl = ref(true)
const labelled = ref(false)
const off = ref(false)
const on = ref(true)
</script>

<template>
  <div class="flex flex-col gap-8 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Default
      </h2>
      <div class="flex items-center gap-4">
        <Switch v-model="plain" aria-label="Plain switch" />
        <code class="text-xs">{{ plain }}</code>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Readout — drawn, never announced
      </h2>
      <div class="flex items-center gap-4">
        <Switch
          v-model="readout"
          :readout="{ checked: 'ON', unchecked: 'OFF' }"
          aria-label="Readout switch"
        />
        <code class="text-xs">{{ readout }}</code>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        One token drives the geometry
      </h2>
      <div class="flex items-center gap-4">
        <Switch
          v-model="small"
          style="--switch-height: 1rem"
          aria-label="Small switch"
        />
        <Switch v-model="medium" aria-label="Default size switch" />
        <Switch
          v-model="large"
          style="--switch-height: 2.5rem"
          :readout="{ checked: 'YES', unchecked: 'NO' }"
          aria-label="Large switch"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Themed — the Thumb and Readout move with the Track
      </h2>
      <div class="flex items-center gap-4">
        <Switch
          v-model="themed"
          style="--switch-track-color-checked: var(--color-success)"
          :readout="{ checked: 'LIVE', unchecked: 'OFF' }"
          aria-label="Success switch"
        />
        <Switch
          v-model="failed"
          :style="{ '--switch-track-color-checked': 'var(--color-error)' }"
          aria-label="Error switch"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Width follows the longer string; `class` reaches the root
      </h2>
      <div class="flex items-center gap-4">
        <Switch
          v-model="wide"
          :readout="{ checked: 'Subscribed', unchecked: 'Not subscribed' }"
          aria-label="Subscription switch"
        />
        <Switch v-model="fixedWidth" class="w-32" aria-label="Fixed width switch" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        RTL — no override exists; the Thumb travels on the inline axis
      </h2>
      <div dir="rtl" class="flex items-center gap-4">
        <Switch
          v-model="rtl"
          :readout="{ checked: 'نعم', unchecked: 'لا' }"
          aria-label="RTL switch"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Named by text already on screen
      </h2>
      <div class="flex items-center gap-2">
        <p :id="`${id}-notifications`">
          Email notifications
        </p>
        <Switch v-model="labelled" :aria-labelledby="`${id}-notifications`" />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Disabled — out of the tab order, state still reported
      </h2>
      <div class="flex items-center gap-4">
        <Switch v-model="off" disabled aria-label="Disabled off switch" />
        <Switch
          v-model="on"
          disabled
          :readout="{ checked: 'ON', unchecked: 'OFF' }"
          aria-label="Disabled on switch"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        No accessible name — warns once in dev
      </h2>
      <div class="flex items-center gap-4">
        <Switch v-model="unnamed" />
      </div>
    </section>
  </div>
</template>
