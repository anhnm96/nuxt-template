<script setup lang="ts">
import Slider from '~/components/base/slider/Slider.vue'

const basic = ref(40)
const brightness = ref(0)
const volume = ref(60)
const price = ref<[number, number]>([200, 800])
const opacity = ref(0.45)
const ticked = ref(500)
const stubborn = ref(37)

/** Bound with `@change` only, so the readout lags the Thumb until the gesture ends. */
const committed = ref(25)
const committedUpdates = ref(0)

const yen = (value: number) => `¥${value.toLocaleString()}`
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Default — one Thumb, jump on press
      </h2>
      <Slider v-model="basic" label="Basic" />
      <p class="text-sm opacity-70">
        {{ basic }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Origin — fills outward from the centre
      </h2>
      <Slider v-model="brightness" :min="-100" :origin="0" label="Brightness" />
      <p class="text-sm opacity-70">
        {{ brightness }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        iOS — no Thumb at rest, no jump on press
      </h2>
      <p class="text-sm opacity-70">
        Tab to it: the Thumb appears on keyboard focus and stays hidden under the mouse.
      </p>
      <Slider
        v-model="volume"
        :thumb="false"
        track-press="ignore"
        label="Volume"
        style="--slider-track-height: 1.75rem"
      />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Range — the Thumbs cross
      </h2>
      <p class="text-sm opacity-70">
        Drag one past the other. The model stays sorted and the labels follow order.
      </p>
      <Slider
        v-model="price"
        range
        :max="1000"
        :step="50"
        label="Price"
        :format-value="yen"
      />
      <p class="text-sm opacity-70">
        {{ yen(price[0]) }} – {{ yen(price[1]) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Ticks — the consumer's markup, the component's coordinates
      </h2>
      <Slider v-model="ticked" :max="1000" :step="100" label="Ticked" class="mb-6">
        <template #default="{ percentOf }">
          <span
            v-for="tick in [0, 250, 500, 750, 1000]"
            :key="tick"
            class="absolute top-full mt-1 -translate-x-1/2 text-xs opacity-60"
            :style="{ left: percentOf(tick) }"
          >{{ tick }}</span>
        </template>
      </Slider>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Continuous — `step: 0`, announced through `formatValue`
      </h2>
      <Slider
        v-model="opacity"
        :max="1"
        :step="0"
        label="Opacity"
        :format-value="(value) => `${Math.round(value * 100)}%`"
      />
      <p class="text-sm opacity-70">
        {{ opacity.toFixed(3) }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        `@change` only — one update per gesture
      </h2>
      <p class="text-sm opacity-70">
        The pattern an expensive consumer uses. Drag across the Track: the count rises by one.
      </p>
      <Slider
        :model-value="committed"
        label="Committed"
        @change="committed = $event; committedUpdates++"
      />
      <p class="text-sm opacity-70">
        {{ committed }} — {{ committedUpdates }} update(s)
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        An off-grid value is rendered, never corrected
      </h2>
      <p class="text-sm opacity-70">
        37 on a grid of 5. It stays at 37 until the first key press or drag.
      </p>
      <Slider v-model="stubborn" :step="5" label="Stubborn" />
      <p class="text-sm opacity-70">
        {{ stubborn }}
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Themed and disabled
      </h2>
      <Slider
        :model-value="70"
        label="Themed"
        style="--slider-track-height: 0.375rem; --slider-fill-color: var(--color-primary); --slider-thumb-size: 1.25rem"
      />
      <Slider :model-value="30" disabled label="Disabled" />
    </section>
  </div>
</template>
