<script setup lang="ts">
/**
 * Type-level regression guard, checked by `pnpm typecheck` (vue-tsc).
 *
 * `bound` selects the type of `v-model` (ADR-0014). The `@vue-expect-error` lines prove that
 * the selection bites: if `v-model` widens, the mismatched bindings stop failing and vue-tsc
 * reports the directives as unused.
 */
import MaskedInput from '~/components/base/date-picker/MaskedInput.vue'

const PHONE = { mask: '+{1} (000) 000-0000' } as const
const NUMBER = { mask: Number, min: -100, max: 100 } as const
const DATE = { mask: Date } as const

const text = ref('')
const amount = ref<number | null>(null)
const date = ref<Date | null>(null)

// Deliberately mismatched, to prove the narrowing bites.
const amountAsText = ref('')
const textAsNumber = ref<number | null>(null)
</script>

<template>
  <div>
    <!-- unmasked -->
    <MaskedInput v-model="text" :mask-options="PHONE" />
    <!-- masked -->
    <MaskedInput v-model="text" bound="masked" :mask-options="PHONE" />
    <!-- typed number -->
    <MaskedInput v-model="amount" bound="typed" :mask-options="NUMBER" />
    <!-- typed date -->
    <MaskedInput
      v-model="date"
      bound="typed"
      :mask-options="DATE"
      @accept="readings => readings.masked.toUpperCase()"
    />

    <!-- @vue-expect-error a string does not hold a typed number -->
    <MaskedInput v-model="amountAsText" bound="typed" :mask-options="NUMBER" />
    <!-- @vue-expect-error the unmasked reading is a string -->
    <MaskedInput v-model="textAsNumber" :mask-options="PHONE" />
    <!-- @vue-expect-error `bound` names one of three readings -->
    <MaskedInput v-model="text" bound="raw" :mask-options="PHONE" />
  </div>
</template>
