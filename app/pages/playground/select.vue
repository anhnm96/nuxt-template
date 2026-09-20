<script setup lang="ts">
import Select from '~/components/base/select/Select.vue'

interface Game { gameId: string, gameName: string, retired?: boolean }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g3', gameName: 'Cobalt Drift', retired: true },
  { gameId: 'g4', gameName: 'Dune Racer' },
  { gameId: 'g5', gameName: 'Echo Valley' },
  { gameId: 'g6', gameName: 'Frost Signal' },
  { gameId: 'g7', gameName: 'Gale Runner' },
  { gameId: 'g8', gameName: 'Harbor Lights' },
]

const many = Array.from({ length: 60 }, (_, i) => ({
  gameId: `m${i}`,
  gameName: `Item ${String(i).padStart(2, '0')}`,
}))

// primitive Value
const basic = ref<string | null>(null)
const searchable = ref<string | null>(null)
const clearable = ref<string | null>('g2')
const paged = ref<string | null>(null)
const multi = ref<string[]>([])

// whole-Item Value — the case that needs itemKey
const objectValue = ref<Game | null>(null)

// An Unresolved Value: set before `items` exist, exactly like a restored saved search.
const unresolvedItems = ref<Game[]>([])
const unresolved = ref<string | null>('g4')
const isLoading = ref(true)
onMounted(() => {
  setTimeout(() => {
    unresolvedItems.value = games
    isLoading.value = false
  }, 2500)
})

// Groups: deliberately NOT clustered, to prove first-appearance ordering regroups them.
const grouped = [
  { id: 'a1', name: 'Alpha Strike', cat: 'Action' },
  { id: 'r1', name: 'Rune Keeper', cat: 'RPG' },
  { id: 'a2', name: 'Blast Radius', cat: 'Action' },
  { id: 'u1', name: 'Uncategorised Thing' },
  { id: 'r2', name: 'Spellbound', cat: 'RPG' },
  { id: 'p1', name: 'Grid Runner', cat: 'Puzzle' },
]
const groupValue = ref<string | null>(null)

// Nested source data, consumed directly — no flattening at the call site.
const nested = [
  { title: 'Consoles', games: [{ id: 'c1', name: 'Switch Party' }, { id: 'c2', name: 'Pad Master' }] },
  { title: 'Handhelds', games: [{ id: 'h1', name: 'Pocket Quest' }] },
]
const nestedValue = ref<string | null>(null)

// Blocked: loading with no items at all — the popup must refuse to open.
const blockedItems = ref<Game[]>([])
const blockedLoading = ref(true)
const blockedValue = ref<string | null>(null)

// A dangling Value — loading finished and nothing matched.
const dangling = ref<string | null>('does-not-exist')
</script>

<template>
  <div class="grid max-w-5xl gap-6 p-8 md:grid-cols-2">
    <div class="flex flex-col gap-1">
      <Label for="t-basic">Basic (primitive value, typeahead)</Label>
      <Select id="t-basic" v-model="basic" :items="games" item-label="gameName" item-value="gameId" item-disabled="retired" />
      <code data-testid="out-basic" class="text-xs text-muted">{{ basic ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-search">Searchable</Label>
      <Select id="t-search" v-model="searchable" searchable :items="games" item-label="gameName" item-value="gameId" />
      <code data-testid="out-search" class="text-xs text-muted">{{ searchable ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-clear">Clearable</Label>
      <Select id="t-clear" v-model="clearable" clearable :items="games" item-label="gameName" item-value="gameId" />
      <code data-testid="out-clear" class="text-xs text-muted">{{ clearable ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-object">Whole-Item value (itemKey required)</Label>
      <Select id="t-object" v-model="objectValue" :items="games" item-label="gameName" item-key="gameId" />
      <code data-testid="out-object" class="text-xs text-muted">{{ objectValue?.gameId ?? 'null' }}</code>
      <!-- A different object with identical contents — what a restored saved search looks like.
           Reference equality would fail here; Key matching must not. -->
      <button
        type="button" data-testid="restore-object" class="btn btn-text self-start text-xs"
        @click="objectValue = JSON.parse(JSON.stringify(games[4]))"
      >
        restore Echo Valley from JSON
      </button>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-paged">60 items (Home/End/PageUp/PageDown)</Label>
      <Select id="t-paged" v-model="paged" searchable :items="many" item-label="gameName" item-value="gameId" />
      <code data-testid="out-paged" class="text-xs text-muted">{{ paged ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-multi">Multiple</Label>
      <Select id="t-multi" v-model="multi" multiple searchable clearable :items="games" item-label="gameName" item-value="gameId" />
      <code data-testid="out-multi" class="text-xs text-muted">{{ multi.length ? multi.join(',') : '[]' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-unresolved">Unresolved while loading (resolves after 2.5s)</Label>
      <Select id="t-unresolved" v-model="unresolved" :loading="isLoading" :items="unresolvedItems" item-label="gameName" item-value="gameId" />
      <code data-testid="out-unresolved" class="text-xs text-muted">{{ unresolved ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-dangling">Dangling value (not loading, no match)</Label>
      <Select id="t-dangling" v-model="dangling" :items="games" item-label="gameName" item-value="gameId">
        <template #value="{ option, modelValue }">
          <span v-if="option" class="truncate">{{ option.label }}</span>
          <span v-else class="truncate text-error">unknown: {{ modelValue }}</span>
        </template>
      </Select>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-group">Groups (unsorted input, first-appearance order)</Label>
      <Select
        id="t-group" v-model="groupValue" searchable
        :items="grouped" item-label="name" item-value="id" item-group="cat"
      />
      <code data-testid="out-group" class="text-xs text-muted">{{ groupValue ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-nested">Nested items (itemChildren)</Label>
      <Select
        id="t-nested" v-model="nestedValue"
        :items="nested" item-children="games" item-group="title" item-label="name" item-value="id"
      />
      <code data-testid="out-nested" class="text-xs text-muted">{{ nestedValue ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-blocked">Loading + no items (must not open)</Label>
      <Select
        id="t-blocked" v-model="blockedValue"
        :items="blockedItems" :loading="blockedLoading" item-label="gameName" item-value="gameId"
      />
      <button
        type="button" data-testid="finish-loading" class="btn btn-text self-start text-xs"
        @click="blockedItems = games; blockedLoading = false"
      >
        finish loading
      </button>
    </div>

    <div class="flex flex-col gap-1">
      <Label id="t-attrs-label" for="t-attrs">$attrs split probe</Label>
      <Select
        id="t-attrs"
        class="max-w-60"
        aria-describedby="t-attrs-hint"
        data-probe="on-trigger"
        :items="games"
        item-label="gameName"
        item-value="gameId"
      />
      <p id="t-attrs-hint" class="text-xs text-muted">
        class belongs on the box, aria on the combobox
      </p>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-disabled">Disabled / invalid</Label>
      <Select id="t-disabled" :items="games" item-label="gameName" item-value="gameId" disabled />
      <Select :items="games" item-label="gameName" item-value="gameId" invalid class="mt-2" />
    </div>
  </div>
</template>
