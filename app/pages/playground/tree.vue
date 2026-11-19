<script setup lang="ts">
import Tree from '~/components/base/tree/Tree.vue'

// --- File explorer -------------------------------------------------------------
// A picker of files only: `select-parents="false"` makes a click on a Parent Node only expand
// or collapse it.

interface FileEntry {
  name: string
  path: string
  children?: FileEntry[]
}

/** Folders first, then by name. A real explorer sorts like this. */
function sortEntries(entries: FileEntry[]): FileEntry[] {
  return entries
    .map(entry => entry.children ? { ...entry, children: sortEntries(entry.children) } : entry)
    .toSorted((a, b) => Number(!!b.children) - Number(!!a.children) || a.name.localeCompare(b.name))
}

const files = sortEntries([
  { name: 'app.vue', path: 'app.vue' },
  { name: 'package.json', path: 'package.json' },
  { name: 'nuxt.config.ts', path: 'nuxt.config.ts' },
  {
    name: 'pages',
    path: 'pages',
    children: [
      { name: 'index.vue', path: 'pages/index.vue' },
      { name: 'about.vue', path: 'pages/about.vue' },
      { name: 'blog', path: 'pages/blog', children: [{ name: '[slug].vue', path: 'pages/blog/[slug].vue' }] },
    ],
  },
  {
    name: 'composables',
    path: 'composables',
    children: [{ name: 'useCounter.ts', path: 'composables/useCounter.ts' }],
  },
  { name: 'public', path: 'public', children: [] },
  { name: 'helpers.mjs', path: 'helpers.mjs' },
])

const FILE_ICONS: { match: RegExp, icon: string }[] = [
  { match: /\.vue$/, icon: 'catppuccin:vue' },
  { match: /nuxt\.config\.\w+$/, icon: 'catppuccin:nuxt' },
  { match: /package\.json$/, icon: 'catppuccin:npm' },
  { match: /\.[mc]?tsx?$/, icon: 'catppuccin:typescript' },
  { match: /\.[mc]?jsx?$/, icon: 'catppuccin:javascript' },
]

function fileIcon(entry: FileEntry, expanded: boolean) {
  if (entry.children) return expanded ? 'catppuccin:folder-open' : 'catppuccin:folder'
  return FILE_ICONS.find(({ match }) => match.test(entry.name))?.icon ?? 'catppuccin:file'
}

const selectedPath = ref<string | null>('pages/blog/[slug].vue')
const filesExpanded = ref<Key[]>(['pages'])

// --- Multiple selection ----------------------------------------------------------
// Two Parent Nodes have the Label `2000s`; the Keys keep them apart. `Comedy` is disabled, and its
// child is not.

interface Category {
  id: string
  label: string
  children?: Category[]
  disabled?: boolean
}

const library: Category[] = [
  {
    id: 'movies',
    label: 'Movies',
    children: [
      {
        id: 'action',
        label: 'Action',
        children: [
          {
            id: 'action-2000s',
            label: '2000s',
            children: [
              { id: 'gladiator', label: 'Gladiator.mp4', disabled: true },
              { id: 'dark-knight', label: 'The-Dark-Knight.mp4' },
            ],
          },
          { id: 'action-2010s', label: '2010s', children: [] },
        ],
      },
      {
        id: 'comedy',
        label: 'Comedy',
        disabled: true,
        children: [{ id: 'comedy-2000s', label: '2000s', children: [{ id: 'superbad', label: 'Superbad.mp4' }] }],
      },
    ],
  },
  { id: 'music', label: 'Music', children: [{ id: 'rock', label: 'Rock', children: [] }] },
  { id: 'pictures', label: 'Pictures', children: [] },
  { id: 'passwords', label: 'passwords.txt' },
]

const selectedIds = ref<string[]>(['dark-knight'])

// --- Checkboxes and replace -------------------------------------------------------
// The same Items. Checkboxes need `toggle`; `replace` selects like a file explorer.

const checkedIds = ref<string[]>([])
const explorerIds = ref<string[]>([])
const lastRowClick = ref('')

// --- Navigation only -------------------------------------------------------------
// No `v-model`: the Tree has no Selected Node and no `aria-selected`.

interface Department {
  code: string
  name: string
  headcount: number
  teams?: Department[]
}

const org: Department[] = [
  {
    code: 'eng',
    name: 'Engineering',
    headcount: 42,
    teams: [
      { code: 'eng-web', name: 'Web', headcount: 12 },
      { code: 'eng-platform', name: 'Platform', headcount: 18, teams: [{ code: 'eng-sre', name: 'SRE', headcount: 6 }] },
      { code: 'eng-mobile', name: 'Mobile', headcount: 12 },
    ],
  },
  { code: 'design', name: 'Design', headcount: 8, teams: [{ code: 'design-brand', name: 'Brand', headcount: 3 }] },
  { code: 'sales', name: 'Sales', headcount: 15 },
]
</script>

<template>
  <div class="grid gap-8 p-8 lg:grid-cols-3">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        File explorer — files only
      </h2>
      <Tree
        v-model="selectedPath"
        v-model:expanded="filesExpanded"
        :items="files"
        item-label="name"
        item-value="path"
        :select-parents="false"
        aria-label="Project files"
        class="w-64 rounded-md border border-elevated p-1"
      >
        <template #item-leading="{ item, expanded }">
          <Icon :name="fileIcon(item, expanded)" class="size-4 shrink-0" />
        </template>
      </Tree>
      <code class="text-xs">v-model: {{ selectedPath }}</code>
      <code class="text-xs">expanded: {{ filesExpanded }}</code>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Multiple, with disabled Nodes
      </h2>
      <Tree
        v-model="selectedIds"
        :items="library"
        item-value="id"
        item-disabled="disabled"
        multiple
        aria-label="Library"
        class="w-64 rounded-md border border-elevated p-1"
      />
      <code class="text-xs">v-model: {{ selectedIds }}</code>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Checkboxes
      </h2>
      <Tree
        v-model="checkedIds"
        :items="library"
        item-value="id"
        item-disabled="disabled"
        multiple
        checkboxes
        aria-label="Library with checkboxes"
        class="w-64 rounded-md border border-elevated p-1"
      />
      <code class="text-xs">v-model: {{ checkedIds }}</code>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Replace, without expand on click
      </h2>
      <Tree
        v-model="explorerIds"
        :items="library"
        item-value="id"
        item-disabled="disabled"
        multiple
        selection-behavior="replace"
        :expand-on-click="false"
        aria-label="Library, replace"
        class="w-64 rounded-md border border-elevated p-1"
        @row-click="({ node }) => lastRowClick = node.label"
      />
      <code class="text-xs">v-model: {{ explorerIds }}</code>
      <code class="text-xs">last row-click: {{ lastRowClick }}</code>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Navigation only, with a trailing slot
      </h2>
      <Tree
        :items="org"
        item-key="code"
        item-label="name"
        item-children="teams"
        aria-label="Departments"
        class="w-64 rounded-md border border-elevated p-1"
      >
        <template #item-trailing="{ item }">
          <span class="text-xs text-muted tabular-nums">{{ item.headcount }}</span>
        </template>
      </Tree>
    </section>
  </div>
</template>
