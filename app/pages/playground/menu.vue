<script setup lang="ts">
import ContextMenu from '~/components/base/context-menu/ContextMenu.vue'
import Dropdown from '~/components/base/dropdown/Dropdown.vue'
import Menu from '~/components/base/menu/Menu.vue'
import MenuGroup from '~/components/base/menu/MenuGroup.vue'
import MenuItem from '~/components/base/menu/MenuItem.vue'
import MenuSeparator from '~/components/base/menu/MenuSeparator.vue'

/** What the last activation was, so close-on-activate is visible rather than inferred. */
const lastAction = ref('—')
function run(label: string) {
  lastAction.value = `${label} @ ${new Date().toLocaleTimeString()}`
}

// --- Checked Items -----------------------------------------------------------
// The host owns the value and the Menu only reports it, exactly like the Tiptap toolbars.
const fontSize = ref('11')
const sizes = ['8', '9', '10', '11', '12', '14', '16', '18', '20', '24', '28', '32', '36', '48', '60', '72', '96']

const align = ref('left')
const listStyle = ref('disc')

// --- Typeahead ---------------------------------------------------------------
// Four labels start with C, so pressing `c` repeatedly must walk them rather than
// building a "cccc" buffer that matches nothing.
const editCommands = [
  'Copy',
  'Cut',
  'Clear',
  'Close',
  'Delete',
  'Duplicate',
  'Export',
  'Find',
  'Import',
  'Print',
]

// --- ContextMenu -------------------------------------------------------------
const rows = ref([
  { id: 'r1', name: 'Quarterly report', locked: false },
  { id: 'r2', name: 'Budget forecast', locked: true },
  { id: 'r3', name: 'Headcount plan', locked: false },
])
function removeRow(id: string) {
  rows.value = rows.value.filter(row => row.id !== id)
  run(`deleted ${id}`)
}

/** Drives the `v-model:open` path, which has no pointer behind it. */
const controlledOpen = ref(false)
</script>

<template>
  <div class="flex flex-col gap-8 p-8">
    <header class="flex flex-col gap-1">
      <h1 class="text-lg font-semibold">
        Menu &amp; ContextMenu
      </h1>
      <p class="max-w-3xl text-sm text-muted">
        A Menu owns no placement. Everything below is the same Menu under two Hosts —
        <code>Dropdown</code> where a trigger exists, <code>ContextMenu</code> where only a
        point does. Activating an item dismisses its Host with nothing wired at the call site.
      </p>
      <p class="text-sm">
        last action: <code data-testid="out-last" class="text-muted">{{ lastAction }}</code>
      </p>
    </header>

    <div class="flex flex-wrap items-start gap-6">
      <!-- commands -->
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          Commands
        </h2>
        <Dropdown placement="bottom-start">
          <button class="btn btn-outline">
            Table
          </button>
          <template #popover>
            <Menu label="Table">
              <MenuItem label="Add row above" @select="run('Add row above')">
                <Icon class="text-lg" name="i-tabler:row-insert-top" />
                Add row above
              </MenuItem>
              <MenuItem label="Add row below" @select="run('Add row below')">
                <Icon class="text-lg" name="i-tabler:row-insert-bottom" />
                Add row below
              </MenuItem>
              <MenuItem label="Remove row" disabled @select="run('Remove row')">
                <Icon class="text-lg" name="i-tabler:row-remove" />
                Remove row (disabled)
              </MenuItem>
              <MenuSeparator />
              <MenuItem label="Delete table" @select="run('Delete table')">
                <Icon class="text-lg" name="i-mdi:trash-can-outline" />
                Delete table
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
        <p class="mt-2 max-w-60 text-xs text-muted">
          A separator and a disabled row. Both are skipped by the arrows and by Typeahead.
        </p>
      </section>

      <!-- one radio set -->
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          Checked Items · one set
        </h2>
        <Dropdown placement="bottom-start">
          <button class="btn btn-outline">
            Font size: {{ fontSize }}
          </button>
          <template #popover>
            <!-- Unnamed Group: the Menu's own label already says "Font size", and naming
                 the Group the same thing has a reader announce it twice. -->
            <Menu label="Font size">
              <MenuGroup>
                <MenuItem
                  v-for="size in sizes"
                  :key="size"
                  :label="size"
                  :checked="size === fontSize"
                  @select="fontSize = size; run(`size ${size}`)"
                >
                  {{ size }}
                </MenuItem>
              </MenuGroup>
            </Menu>
          </template>
        </Dropdown>
        <p class="mt-2 max-w-60 text-xs text-muted">
          Opens on the Checked Item, not the first row. <kbd>ArrowDown</kbd> from the trigger
          lands on {{ fontSize }}. 17 rows, so <kbd>Home</kbd>/<kbd>End</kbd>/<kbd>PageUp</kbd>
          work, and the arrows wrap at the ends.
        </p>
      </section>

      <!-- two radio sets -->
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          Checked Items · two sets
        </h2>
        <Dropdown placement="bottom-start">
          <button class="btn btn-outline">
            Formatting
          </button>
          <template #popover>
            <!-- Named Groups, because one Menu name cannot distinguish two sets. -->
            <Menu label="Formatting">
              <MenuGroup label="Alignment">
                <MenuItem
                  v-for="option in ['left', 'center', 'right', 'justify']"
                  :key="option"
                  :label="option"
                  :checked="option === align"
                  @select="align = option; run(`align ${option}`)"
                >
                  {{ option }}
                </MenuItem>
              </MenuGroup>
              <MenuGroup label="List style">
                <MenuItem
                  v-for="option in ['disc', 'circle', 'square', 'none']"
                  :key="option"
                  :label="option"
                  :checked="option === listStyle"
                  @select="listStyle = option; run(`list ${option}`)"
                >
                  {{ option }}
                </MenuItem>
              </MenuGroup>
            </Menu>
          </template>
        </Dropdown>
        <p class="mt-2 max-w-60 text-xs text-muted">
          align <code data-testid="out-align">{{ align }}</code> · list
          <code data-testid="out-list">{{ listStyle }}</code>. Arrows cross the Group
          boundary; only the announcement is bounded.
        </p>
      </section>

      <!-- typeahead -->
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          Typeahead
        </h2>
        <Dropdown placement="bottom-start">
          <button class="btn btn-outline">
            Edit
          </button>
          <template #popover>
            <Menu label="Edit">
              <MenuItem
                v-for="command in editCommands"
                :key="command"
                :label="command"
                @select="run(command)"
              >
                {{ command }}
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
        <p class="mt-2 max-w-60 text-xs text-muted">
          Press <kbd>c</kbd> repeatedly: Copy → Cut → Clear → Close → back round. Type
          <kbd>d</kbd><kbd>u</kbd> within 500ms for Duplicate.
        </p>
      </section>

      <!-- icon-only labels -->
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          Typeahead · explicit label
        </h2>
        <Dropdown placement="bottom-start">
          <button class="btn btn-outline">
            Icons
          </button>
          <template #popover>
            <Menu label="Icons">
              <MenuItem label="Bold" @select="run('Bold')">
                <Icon class="text-lg" name="i-lucide:bold" />
              </MenuItem>
              <MenuItem label="Italic" @select="run('Italic')">
                <Icon class="text-lg" name="i-lucide:italic" />
              </MenuItem>
              <MenuItem label="Underline" @select="run('Underline')">
                <Icon class="text-lg" name="i-lucide:underline" />
              </MenuItem>
            </Menu>
          </template>
        </Dropdown>
        <p class="mt-2 max-w-60 text-xs text-muted">
          These rows render no text, so <code>textContent</code> is useless. The
          <code>label</code> prop is what Typeahead matches — press <kbd>u</kbd>.
        </p>
      </section>
    </div>

    <!-- ContextMenu ---------------------------------------------------------- -->
    <div class="flex flex-wrap items-start gap-6">
      <section>
        <h2 class="mb-2 text-sm font-semibold">
          ContextMenu · one per row
        </h2>
        <ul class="flex w-64 flex-col gap-1">
          <li
            v-for="row in rows"
            :key="row.id"
            class="relative rounded border border-elevated px-3 py-2 text-sm"
          >
            {{ row.name }}
            <!-- Written inside the row, so it anchors to the row. No shared instance to aim. -->
            <ContextMenu :label="row.name">
              <MenuItem label="Rename" @select="run(`rename ${row.id}`)">
                <Icon class="text-lg" name="i-lucide:pencil" />
                Rename
              </MenuItem>
              <MenuItem label="Duplicate" @select="run(`duplicate ${row.id}`)">
                <Icon class="text-lg" name="i-lucide:copy" />
                Duplicate
              </MenuItem>
              <MenuSeparator />
              <MenuItem
                label="Delete"
                :disabled="row.locked"
                @select="removeRow(row.id)"
              >
                <Icon class="text-lg" name="i-mdi:trash-can-outline" />
                Delete{{ row.locked ? ' (locked)' : '' }}
              </MenuItem>
            </ContextMenu>
          </li>
        </ul>
        <p class="mt-2 max-w-64 text-xs text-muted">
          Right-click a row. Right-click the <em>same</em> row again somewhere else and the
          open Menu moves to the new point. Right-click a different row and the first closes.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold">
          ContextMenu · keyboard
        </h2>
        <div
          tabindex="0"
          class="relative grid h-24 w-64 place-items-center rounded border border-dashed border-elevated text-sm text-muted"
        >
          focus me, then Shift+F10
          <ContextMenu label="Keyboard demo" :at-cursor="false">
            <MenuItem label="First" @select="run('kbd First')">
              First
            </MenuItem>
            <MenuItem label="Second" @select="run('kbd Second')">
              Second
            </MenuItem>
          </ContextMenu>
        </div>
        <p class="mt-2 max-w-64 text-xs text-muted">
          <code>Shift</code>+<code>F10</code> and the context-menu key are bound to the
          Anchor, so they only fire when it holds focus — this box has a
          <code>tabindex</code> for that reason. <code>at-cursor="false"</code> anchors to
          the box rather than the pointer.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold">
          ContextMenu · every item disabled
        </h2>
        <div class="relative grid h-24 w-64 place-items-center rounded border border-dashed border-elevated text-sm text-muted">
          right-click me
          <ContextMenu label="Nothing available">
            <MenuItem label="Rename" disabled>
              Rename
            </MenuItem>
            <MenuItem label="Delete" disabled>
              Delete
            </MenuItem>
          </ContextMenu>
        </div>
        <p class="mt-2 max-w-64 text-xs text-muted">
          No item can hold focus, so the Menu takes the tab stop itself and
          <kbd>Escape</kbd> still closes it. Without that fallback focus never enters the
          popover and the Menu cannot be dismissed from the keyboard at all.
        </p>
      </section>

      <section>
        <h2 class="mb-2 text-sm font-semibold">
          ContextMenu · controlled
        </h2>
        <div class="relative grid h-24 w-64 place-items-center rounded border border-dashed border-elevated text-sm text-muted">
          <button class="btn btn-outline" @click="controlledOpen = true">
            open via v-model
          </button>
          <ContextMenu v-model:open="controlledOpen" label="Controlled">
            <MenuItem label="Only item" @select="run('controlled')">
              Only item
            </MenuItem>
          </ContextMenu>
        </div>
        <p class="mt-2 max-w-64 text-xs text-muted">
          open: <code data-testid="out-controlled">{{ controlledOpen }}</code>. There is no
          pointer behind a <code>v-model</code> open, so it anchors to the box rather than
          to wherever the last right-click happened to be.
        </p>
      </section>
    </div>
  </div>
</template>
