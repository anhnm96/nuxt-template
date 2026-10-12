<script setup lang="ts">
import Autocomplete from '~/components/base/autocomplete/Autocomplete.vue'

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

const basic = ref<string | null>(null)
const prefilled = ref<string | null>('g2')
const clearable = ref<string | null>('g5')
const paged = ref<string | null>(null)

// Freeform: the value is `modelValue ?? query`, so both models are shown side by side.
const freeValue = ref<string | null>(null)
const freeQuery = ref('')
const freeResolved = computed(() => freeValue.value ?? freeQuery.value)

// Whole-Item Value — the case that needs itemKey.
const objectValue = ref<Game | null>(null)

/**
 * Server-side search. The debounce lives here, not in the component: `query` is a model, not
 * an event, so delaying it would make the visible text and the value disagree on a timer.
 * See the component README — "Async".
 */
const remoteQuery = ref('')
const remoteValue = ref<string | null>(null)
const remoteItems = ref<Game[]>([])
const remoteLoading = ref(false)
watchDebounced(remoteQuery, async (q) => {
  if (q.trim().length < 2) {
    remoteItems.value = []
    return
  }
  remoteLoading.value = true
  await new Promise(resolve => setTimeout(resolve, 600))
  remoteItems.value = games.filter(g => g.gameName.toLowerCase().includes(q.toLowerCase()))
  remoteLoading.value = false
}, { debounce: 300 })

/**
 * Short Labels against a threshold. `Go` is two characters and the minimum is three, so the
 * threshold must stop applying once a Value is set — otherwise a field that already holds a
 * choice tells its user to keep typing and refuses to browse.
 */
const langs = [
  { id: 'go', name: 'Go' },
  { id: 'cs', name: 'C#' },
  { id: 'sql', name: 'SQL' },
  { id: 'ts', name: 'TypeScript' },
]
const lang = ref<string | null>('go')

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

/**
 * A Value set before `items` exist. Two things to watch during the 2.5s window: the Query must
 * echo the Label once the Items land, and typing inside the window must not destroy the Value —
 * Abandon restores it from `lastCommittedValue` even though no Option ever resolved.
 *
 * `restartLate` puts both back so the window can be re-entered without reloading the page.
 */
const lateItems = ref<Game[]>([])
const lateValue = ref<string | null>('g4')
const lateQuery = ref('')
const lateLoading = ref(true)

const lateFreeItems = ref<Game[]>([])
const lateFreeValue = ref<string | null>('g4')
const lateFreeQuery = ref('')
const lateFreeLoading = ref(true)
const lateFreeResolved = computed(() => lateFreeValue.value ?? lateFreeQuery.value)

let lateTimer: ReturnType<typeof setTimeout> | undefined

function restartLate() {
  clearTimeout(lateTimer)
  lateItems.value = []
  lateValue.value = 'g4'
  lateQuery.value = ''
  lateLoading.value = true
  lateFreeItems.value = []
  lateFreeValue.value = 'g4'
  lateFreeQuery.value = ''
  lateFreeLoading.value = true
  lateTimer = setTimeout(() => {
    lateItems.value = games
    lateLoading.value = false
    lateFreeItems.value = games
    lateFreeLoading.value = false
  }, 2500)
}

onMounted(restartLate)
onBeforeUnmount(() => clearTimeout(lateTimer))
</script>

<template>
  <div class="grid max-w-5xl gap-6 p-8 md:grid-cols-2">
    <div class="flex flex-col gap-1">
      <Label for="t-basic">Basic (constrained)</Label>
      <Autocomplete
        id="t-basic" v-model="basic"
        :items="games" item-label="gameName" item-value="gameId" item-disabled="retired"
      />
      <code data-testid="out-basic" class="text-xs text-muted">{{ basic ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-prefilled">Prefilled — click to browse, type to search</Label>
      <!-- The Query echoes the Label, so the list stays unfiltered until the text is edited. -->
      <Autocomplete
        id="t-prefilled" v-model="prefilled"
        :items="games" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-prefilled" class="text-xs text-muted">{{ prefilled ?? 'null' }}</code>
      <!--
        A form reset, from outside the component. The Query must go with the Value: leaving the
        Label behind would show a filled field over an empty model, and tabbing through it would
        then restore the Value this button just cleared.
      -->
      <button
        type="button" data-testid="clear-prefilled" class="btn btn-text self-start text-xs"
        @click="prefilled = null"
      >
        clear from the parent
      </button>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-clear">Clearable</Label>
      <Autocomplete
        id="t-clear" v-model="clearable" clearable
        :items="games" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-clear" class="text-xs text-muted">{{ clearable ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-free">Freeform (type anything — Enter keeps your text)</Label>
      <Autocomplete
        id="t-free" v-model="freeValue" v-model:query="freeQuery" freeform clearable
        :items="games" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-free" class="text-xs text-muted">
        value={{ freeValue ?? 'null' }} · query={{ freeQuery || '""' }} · resolved={{ freeResolved || '""' }}
      </code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-object">Whole-Item value (itemKey required)</Label>
      <Autocomplete
        id="t-object" v-model="objectValue"
        :items="games" item-label="gameName" item-key="gameId"
      />
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
      <Label for="t-remote">Server search (debounced here, min 2 chars)</Label>
      <Autocomplete
        id="t-remote" v-model="remoteValue" v-model:query="remoteQuery"
        external-filter clearable :loading="remoteLoading" :min-query-length="2"
        :items="remoteItems" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-remote" class="text-xs text-muted">{{ remoteValue ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-paged">60 items (PageUp/PageDown; Home/End move the caret)</Label>
      <Autocomplete
        id="t-paged" v-model="paged"
        :items="many" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-paged" class="text-xs text-muted">{{ paged ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-short">Short labels, min 3 chars — a set Value still browses</Label>
      <Autocomplete
        id="t-short" v-model="lang" clearable :min-query-length="3"
        :items="langs" item-label="name" item-value="id"
      />
      <code data-testid="out-short" class="text-xs text-muted">{{ lang ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-group">Groups (unsorted input, first-appearance order)</Label>
      <Autocomplete
        id="t-group" v-model="groupValue"
        :items="grouped" item-label="name" item-value="id" item-group="cat"
      />
      <code data-testid="out-group" class="text-xs text-muted">{{ groupValue ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-nested">Nested items (itemChildren)</Label>
      <Autocomplete
        id="t-nested" v-model="nestedValue"
        :items="nested" :item-children="(c: typeof nested[number]) => c.games"
        item-label="name" :item-value="(g: { id: string }) => g.id" item-group="title"
      />
      <code data-testid="out-nested" class="text-xs text-muted">{{ nestedValue ?? 'null' }}</code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-late">Value set before items exist (arrive after 2.5s)</Label>
      <Autocomplete
        id="t-late" v-model="lateValue" v-model:query="lateQuery" :loading="lateLoading"
        :items="lateItems" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-late" class="text-xs text-muted">
        value={{ lateValue ?? 'null' }} · query={{ lateQuery || '""' }}
      </code>
      <!-- Type into either field before the items land: the Value must come back on blur. -->
      <button
        type="button" data-testid="restart-late" class="btn btn-text self-start text-xs"
        @click="restartLate"
      >
        restart the 2.5s window
      </button>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-late-free">Freeform, value set before items exist</Label>
      <Autocomplete
        id="t-late-free" v-model="lateFreeValue" v-model:query="lateFreeQuery" freeform
        :loading="lateFreeLoading" :items="lateFreeItems" item-label="gameName" item-value="gameId"
      />
      <code data-testid="out-late-free" class="text-xs text-muted">
        value={{ lateFreeValue ?? 'null' }} · query={{ lateFreeQuery || '""' }} · resolved={{ lateFreeResolved || '""' }}
      </code>
    </div>

    <div class="flex flex-col gap-1">
      <Label for="t-invalid">Invalid / disabled</Label>
      <Autocomplete
        id="t-invalid" invalid required
        :items="games" item-label="gameName" item-value="gameId"
      />
      <Autocomplete
        disabled :items="games" item-label="gameName" item-value="gameId"
        placeholder="Disabled"
      />
    </div>
  </div>
</template>
