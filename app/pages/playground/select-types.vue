<script setup lang="ts">
/**
 * Type-level regression guard, checked by `pnpm typecheck` (vue-tsc).
 *
 * ADR-0002 was written because a generic `multiple` prop silently broke — the failure was
 * invisible to unit tests and to the runtime. The fix (`multiple?: M & boolean`) is only
 * worth anything if `M` actually narrows `v-model` at a real call site, which is precisely
 * what a `.vue` template type-check verifies and nothing else does.
 *
 * The `@vue-expect-error` lines are the load-bearing half: if narrowing ever regresses so
 * that `modelValue` widens to `V | V[] | null`, the mismatched bindings stop erroring and
 * vue-tsc reports the directives as unused. Either direction fails the build.
 */
import Select from '~/components/base/select/Select.vue'

interface Game { gameId: string, gameName: string }

const games: Game[] = [{ gameId: 'g1', gameName: 'Alpha' }]

const single = ref<string | null>(null)
const multi = ref<string[]>([])

// Deliberately mismatched, to prove the narrowing bites in both directions.
const arrayBoundToSingle = ref<string[]>([])
const scalarBoundToMultiple = ref<string | null>(null)

// Whole-Item mode: omitting `itemValue` makes the Value the Item itself.
const wholeItem = ref<Game | null>(null)
const wholeItems = ref<Game[]>([])

// Nested input: `items` holds Groups, so every item* accessor must key off the CHILD.
interface Category { title: string, games: Game[] }
const categories: Category[] = [{ title: 'Consoles', games }]
const nested = ref<string | null>(null)
const nestedMulti = ref<string[]>([])
const nestedWholeItem = ref<Game | null>(null)
</script>

<template>
  <div>
    <!-- single: modelValue must be `string | null` -->
    <Select
      v-model="single"
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- bare `multiple` attribute: modelValue must be `string[]` -->
    <Select
      v-model="multi"
      multiple
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- @vue-expect-error `string[]` bound to a single-mode Select -->
    <Select
      v-model="arrayBoundToSingle"
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- @vue-expect-error `string | null` bound to a multiple Select -->
    <Select
      v-model="scalarBoundToMultiple"
      multiple
      :items="games"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- whole-Item mode, single: modelValue must be `Game | null` -->
    <Select
      v-model="wholeItem"
      :items="games"
      item-label="gameName"
      item-key="gameId"
    />

    <!-- whole-Item mode, multiple: modelValue must be `Game[]` -->
    <Select
      v-model="wholeItems"
      multiple
      :items="games"
      item-label="gameName"
      item-key="gameId"
    />

    <!-- nested, single: the Value is the child's key, so `string | null` -->
    <Select
      v-model="nested"
      :items="categories"
      item-children="games"
      item-group="title"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- nested + multiple: `string[]` -->
    <Select
      v-model="nestedMulti"
      multiple
      :items="categories"
      item-children="games"
      item-group="title"
      item-label="gameName"
      item-value="gameId"
    />

    <!-- nested, whole-Item: the Value must be the CHILD (`Game`), never the Group -->
    <Select
      v-model="nestedWholeItem"
      :items="categories"
      item-children="games"
      item-group="title"
      item-label="gameName"
      item-key="gameId"
    />

    <!-- @vue-expect-error `title` is a Category key, not a Game key -->
    <Select
      :items="categories"
      item-children="games"
      item-label="title"
    />

    <!-- @vue-expect-error `gameName` is a Game key, so it cannot label a Category -->
    <Select
      :items="categories"
      item-children="games"
      item-label="gameName"
      item-group="gameName"
    />
  </div>
</template>
