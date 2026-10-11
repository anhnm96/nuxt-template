<script setup lang="ts">
/**
 * Type-level regression guard, checked by `pnpm typecheck` (vue-tsc).
 *
 * ADR-0003 chose `M & boolean` over a bare type parameter, and Slider follows it with
 * `range?: R & boolean`. Two separate things need proving and unit tests can see neither:
 * that `range` still casts as a Boolean at runtime — covered in `Slider.spec.ts` — and that
 * it narrows `v-model` to `[number, number]`, which only a `.vue` template type-check shows.
 *
 * The `@vue-expect-error` lines are the load-bearing half. If narrowing regresses so that
 * `modelValue` widens to `number | [number, number]`, the mismatched bindings stop erroring
 * and vue-tsc reports the directives as unused. Either direction fails the build.
 */
import Slider from '~/components/base/slider/Slider.vue'

const value = ref(0)
const pair = ref<[number, number]>([20, 80])

// Deliberately mismatched, to prove the narrowing bites in both directions.
const pairBoundToSingle = ref<[number, number]>([0, 1])
const scalarBoundToRange = ref(0)
</script>

<template>
  <div>
    <!-- Default is a single Thumb: `number`. -->
    <Slider v-model="value" />
    <Slider v-model="pair" range />
    <Slider v-model="pair" :range="true" />

    <!-- @vue-expect-error a single Slider must reject a pair -->
    <Slider v-model="pairBoundToSingle" />
    <!-- @vue-expect-error a range Slider must reject a scalar -->
    <Slider v-model="scalarBoundToRange" range />
    <!-- @vue-expect-error `range` is a boolean, not a bound pair -->
    <Slider v-model="pair" :range="[0, 1]" />

    <!-- `change` carries the same narrowed type as the model. -->
    <Slider :model-value="value" @change="value = $event" />
    <Slider :model-value="pair" range @change="pair = $event" />
    <!-- @vue-expect-error a range `change` emits a pair, never a scalar -->
    <Slider :model-value="pair" range @change="value = $event" />

    <!-- Bounds, grid and Origin are plain numbers and never touch the model type. -->
    <Slider v-model="value" :min="-100" :max="100" :origin="0" :step="0.1" />
    <!-- @vue-expect-error the bounds are numbers, not strings -->
    <Slider v-model="value" min="0" />

    <!-- `trackPress` is a closed union. -->
    <Slider v-model="value" track-press="jump" />
    <Slider v-model="value" track-press="ignore" />
    <!-- @vue-expect-error 'relative' was the old spelling; it is not a member -->
    <Slider v-model="value" track-press="relative" />

    <!-- `rangeLabels` is exactly two strings. -->
    <Slider v-model="pair" range :range-labels="['from', 'to']" />
    <!-- @vue-expect-error one label is not two -->
    <Slider v-model="pair" range :range-labels="['from']" />

    <!-- `formatValue` takes the value and returns what a reader announces. -->
    <Slider v-model="value" :format-value="(v: number) => `${v}%`" />
    <!-- @vue-expect-error it formats a number, not a Date -->
    <Slider v-model="value" :format-value="(v: Date) => v.toISOString()" />

    <!-- The default slot hands back a coordinate helper, not raw geometry. -->
    <Slider v-model="value" :max="1000">
      <template #default="{ percentOf }">
        <span :style="{ left: percentOf(500) }" />
      </template>
    </Slider>
  </div>
</template>
