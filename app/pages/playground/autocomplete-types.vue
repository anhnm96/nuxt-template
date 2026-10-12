<script setup lang="ts">
/**
 * Type-level regression guard, checked by `pnpm typecheck` (vue-tsc).
 *
 * The accessor generics here are a *second copy* of Select's, kept until `useOptionList` is
 * extracted (ADR-0012). `select-types.vue` only guards the first copy, so without this page
 * the two can drift and only one of them would be caught.
 *
 * Unlike Select there is no mode to narrow: `freeform` changes no model's type, which is the
 * point of carrying a Value and a Query separately. What is worth guarding is that `itemValue`
 * still decides what `v-model` carries, in every input shape.
 *
 * The `@vue-expect-error` lines are the load-bearing half: if inference ever widens, the
 * mismatched bindings stop erroring and vue-tsc reports the directives as unused. Either
 * direction fails the build.
 */
import Autocomplete from '~/components/base/autocomplete/Autocomplete.vue'

interface Game { gameId: string, gameName: string }

const games: Game[] = [{ gameId: 'g1', gameName: 'Alpha' }]

const byKey = ref<string | null>(null)
const query = ref('')

// Deliberately mismatched, to prove the inference bites.
const numberBoundToStringValue = ref<number | null>(null)
const numberBoundToQuery = ref<number>(0)

// Whole-Item mode: omitting `itemValue` makes the Value the Item itself.
const wholeItem = ref<Game | null>(null)

// Nested input: `items` holds Groups, so every item* accessor must key off the CHILD.
interface Category { title: string, games: Game[] }
const categories: Category[] = [{ title: 'Consoles', games }]
const nested = ref<string | null>(null)
const nestedWholeItem = ref<Game | null>(null)
</script>

<template>
  <div>
    <!-- `item-value` as a key: modelValue must be `string | null` -->
    <Autocomplete
      v-model="byKey"
      v-model:query="query"
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- `freeform` must not change the model's type -->
    <Autocomplete
      v-model="byKey"
      v-model:query="query"
      freeform
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- @vue-expect-error `number | null` bound to a `string`-valued Autocomplete -->
    <Autocomplete
      v-model="numberBoundToStringValue"
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- @vue-expect-error the Query is always a string -->
    <Autocomplete
      v-model:query="numberBoundToQuery"
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- whole-Item mode: modelValue must be `Game | null`, and `itemKey` is required -->
    <Autocomplete
      v-model="wholeItem"
      :items="games"
      item-label="gameName"
      item-key="gameId"
    />

    <!-- @vue-expect-error `string | null` bound to a whole-Item Autocomplete -->
    <Autocomplete
      v-model="byKey"
      :items="games"
      item-label="gameName"
      item-key="gameId"
    />

    <!--
      Nested: `item-children` is a type parameter, so its function form needs an explicit
      parameter type. Everything downstream then keys off `Game`, not `Category`.
    -->
    <Autocomplete
      v-model="nested"
      :items="categories"
      :item-children="(c: Category) => c.games"
      item-label="gameName"
      :item-value="(g: Game) => g.gameId"
    />

    <!-- nested whole-Item: the Value is a child, never the Group -->
    <Autocomplete
      v-model="nestedWholeItem"
      :items="categories"
      :item-children="(c: Category) => c.games"
      item-label="gameName"
      item-key="gameId"
    />
  </div>
</template>
