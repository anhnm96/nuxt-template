<script setup lang="ts">
import Tooltip from '~/components/base/tooltip/Tooltip.client.vue'
import { SKIP_WINDOW_MS } from '~/stores/tooltip'

/** What the last activation was, so a Tap that must *not* activate its Anchor is visible. */
const lastAction = ref('—')
function run(label: string) {
  lastAction.value = `${label} @ ${new Date().toLocaleTimeString()}`
}

const sides = ['top', 'bottom', 'left', 'right'] as const

const toolbar = [
  { icon: 'i-lucide:bold', label: 'Bold', hint: 'Bold · Ctrl+B' },
  { icon: 'i-lucide:italic', label: 'Italic', hint: 'Italic · Ctrl+I' },
  { icon: 'i-lucide:underline', label: 'Underline', hint: 'Underline · Ctrl+U' },
  { icon: 'i-lucide:strikethrough', label: 'Strikethrough', hint: 'Strikethrough' },
  { icon: 'i-lucide:code', label: 'Code', hint: 'Inline code' },
]

/** Drives the `v-model` path. It falls on its own once the leave transition ends. */
const controlledOpen = ref(false)

const dynamicHints = ['Save draft', 'Hi', 'Save'] as const
const dynamicHint = ref<string>(dynamicHints[0])
let hintInterval: ReturnType<typeof setInterval> | undefined

function stopDynamicHint() {
  clearInterval(hintInterval)
  hintInterval = undefined
}

function startDynamicHint(event: PointerEvent) {
  if (event.pointerType === 'touch') return
  stopDynamicHint()
  let index = 0
  dynamicHint.value = dynamicHints[index]!
  hintInterval = setInterval(() => {
    index = (index + 1) % dynamicHints.length
    dynamicHint.value = dynamicHints[index]!
  }, 1000)
}

onBeforeUnmount(stopDynamicHint)

/** Flipped while the tooltip is open, to show it closing rather than only refusing to open. */
const tooltipDisabled = ref(false)

const events = ref([
  { id: 'e1', name: 'Standup', time: '09:30 – 09:45' },
  { id: 'e2', name: 'Design review', time: '14:00 – 15:00' },
])
function removeEvent(id: string) {
  events.value = events.value.filter(event => event.id !== id)
  run(`deleted ${id}`)
}
</script>

<template>
  <div class="flex flex-col gap-8 p-8">
    <header class="flex flex-col gap-1">
      <h1 class="text-lg font-semibold">
        Tooltip
      </h1>
      <p class="max-w-3xl text-sm text-muted">
        A Tooltip is written <em>inside</em> its Anchor and teleported to <code>body</code>,
        so no overflow ancestor clips it. Every example below is the same component; only
        its props differ.
      </p>
      <p class="text-sm">
        last action: <code data-testid="out-last" class="text-muted">{{ lastAction }}</code>
      </p>
    </header>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Shared tooltip motion
      </h2>
      <p class="mb-4 text-sm text-muted">
        Move between these buttons: one surface glides, resizes, and crossfades its content.
        Try reversing direction quickly, or use Tab to focus each button.
      </p>
      <div class="flex flex-wrap items-center gap-3">
        <button data-testid="group-short" class="btn btn-outline">
          Short hint
          <Tooltip group="playground-motion">
            Save draft
          </Tooltip>
        </button>
        <button data-testid="group-long" class="btn btn-outline">
          Longer hint
          <Tooltip group="playground-motion">
            Save your changes without publishing them.
          </Tooltip>
        </button>
        <button data-testid="group-multiline" class="btn btn-outline">
          Two lines
          <Tooltip group="playground-motion">
            Publish changes.<br>Everyone can see the latest version.
          </Tooltip>
        </button>
        <button data-testid="group-side" class="btn btn-outline">
          Another side
          <Tooltip group="playground-motion" placement="bottom">
            This hint prefers the bottom.
          </Tooltip>
        </button>
        <button data-testid="group-separate" class="btn btn-outline">
          Separate group
          <Tooltip group="playground-separate">
            An independent surface.
          </Tooltip>
        </button>
        <button data-testid="group-constrained" class="btn btn-outline">
          Wrapped hint
          <Tooltip group="playground-motion" style="max-width: 150px">
            This longer description wraps within the destination width instead of clipping its text.
          </Tooltip>
        </button>
        <button data-testid="group-fixed-width" class="btn btn-outline">
          Fixed width
          <Tooltip group="playground-motion" :style="{ width: '210px', padding: '12px 18px' }">
            This description uses a fixed width and custom padding.
          </Tooltip>
        </button>
      </div>
    </section>

    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Dynamic tooltip text
      </h2>
      <p class="mb-3 text-sm text-muted">
        Hover and keep the pointer still. The hint cycles through Save draft, Hi, and Save
        every second, and the surface resizes to fit. Leaving the button stops the cycle.
      </p>
      <button
        data-testid="group-dynamic"
        class="btn btn-outline"
        @pointerenter="startDynamicHint"
        @pointerleave="stopDynamicHint"
      >
        Hover for changing text
        <Tooltip group="playground-dynamic">
          {{ dynamicHint }}
        </Tooltip>
      </button>
    </section>

    <!-- placement -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Placement
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <button v-for="side in sides" :key="side" class="btn btn-outline">
          {{ side }}
          <Tooltip :placement="side">
            Anchored {{ side }}
          </Tooltip>
        </button>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        The side is a preference, not a promise: put a button near the viewport edge and
        Floating UI flips it. The tooltip scales from the edge it ends up on rather than
        from its centre — <code>--trigger-origin</code> is resolved from the placement that
        settled, not from the one that was asked for.
      </p>
    </section>

    <!-- animation -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Animation
      </h2>
      <div class="flex flex-wrap items-start gap-8">
        <div class="flex flex-col gap-2">
          <span class="text-xs text-muted">sweep this row</span>
          <div class="flex rounded-md border border-elevated p-1">
            <button
              v-for="tool in toolbar"
              :key="tool.label"
              class="btn btn-text btn-icon"
              :aria-label="tool.label"
              @click="run(tool.label)"
            >
              <Icon :name="tool.icon" />
              <Tooltip>{{ tool.hint }}</Tooltip>
            </button>
          </div>
        </div>

        <!--
          Far enough from the row that reaching it is a separate gesture. Hovering it more
          than the Sweep window after leaving the row must animate; hovering it straight
          after must not.
        -->
        <div class="flex flex-col gap-2">
          <span class="text-xs text-muted">then come back to this one</span>
          <button class="btn btn-outline">
            a lone Anchor
            <Tooltip>Reached on its own, so it animates.</Tooltip>
          </button>
        </div>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        Sweep the row: the first hint waits 200ms and fades in, and every hint after it opens
        at once with no animation, because the pointer is already reading tooltips. Stop for
        a moment and the next one waits and fades again — the window is {{ SKIP_WINDOW_MS }}ms
        from the moment an Anchor is left, so it closes on its own when you stop sweeping.
      </p>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        The window is keyed off <em>leaving</em> an Anchor, not off a tooltip being open.
        Open the <code>v-model</code> tooltip further down, leave it pinned, then hover
        anything up here: it still waits and still animates. Keyed off "something is open",
        one pinned tooltip would make every tooltip on the page instant.
      </p>
    </section>

    <!-- delay -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Delay
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <button class="btn btn-outline">
          default (200ms)
          <Tooltip>Opens after 200ms</Tooltip>
        </button>
        <button class="btn btn-outline">
          no delay
          <Tooltip :delay="0">
            Opens at once
          </Tooltip>
        </button>
        <button class="btn btn-outline">
          slow (700ms)
          <Tooltip :delay="700">
            Opens after 700ms
          </Tooltip>
        </button>
        <button class="btn btn-outline">
          hideDelay 500ms
          <Tooltip :hide-delay="500">
            Leave the button and come back inside 500ms — the hide is cancelled.
          </Tooltip>
        </button>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        A delay exists so a pointer crossing an Anchor on its way somewhere else opens
        nothing. <code>hideDelay</code> covers the opposite case: a pointer that leaves and
        comes straight back should not have to wait a second time.
      </p>
    </section>

    <!-- offset and clipping -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Offset &amp; clipping
      </h2>
      <div class="flex flex-wrap items-start gap-6">
        <div class="flex flex-wrap items-center gap-3">
          <button class="btn btn-outline">
            flush
            <Tooltip :offset="0">
              offset 0
            </Tooltip>
          </button>
          <button class="btn btn-outline">
            far
            <Tooltip :offset="24">
              offset 24
            </Tooltip>
          </button>
        </div>

        <!-- The reason for the Teleport: an ancestor that would otherwise clip. -->
        <div class="h-20 w-64 overflow-hidden rounded border border-dashed border-elevated p-3">
          <p class="mb-2 text-xs text-muted">
            overflow-hidden parent
          </p>
          <button class="btn btn-outline btn-sm">
            still escapes
            <Tooltip placement="bottom">
              Teleported to body, so this box cannot clip it.
            </Tooltip>
          </button>
        </div>
      </div>
    </section>

    <!-- content -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Content
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <button class="btn btn-outline">
          paragraph
          <Tooltip class="max-w-64">
            A tooltip describes its Anchor. If the text needs a paragraph, it is probably
            documentation rather than a description.
          </Tooltip>
        </button>
        <button class="btn btn-outline">
          markup
          <Tooltip>
            <span class="flex items-center gap-1.5">
              <Icon class="text-base text-warn" name="i-lucide:triangle-alert" />
              Unsaved changes
            </span>
          </Tooltip>
        </button>
        <span class="text-sm underline decoration-dotted">
          a non-button Anchor
          <Tooltip>Any element can be an Anchor.</Tooltip>
        </span>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        <code>class</code> lands on the tooltip surface rather than on a wrapper, which is
        what lets <code>max-w-64</code> above bound the text.
      </p>
    </section>

    <!-- followCursor -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        followCursor
      </h2>
      <div class="flex flex-wrap items-start gap-4">
        <div class="relative grid h-24 w-56 place-items-center rounded border border-dashed border-elevated text-sm text-muted">
          true — floats freely
          <Tooltip follow-cursor>
            tracks both axes
          </Tooltip>
        </div>
        <div class="relative grid h-24 w-56 place-items-center rounded border border-dashed border-elevated text-sm text-muted">
          'x' — slides sideways
          <Tooltip follow-cursor="x" placement="top">
            pinned to the top edge
          </Tooltip>
        </div>
        <div class="relative grid h-24 w-56 place-items-center rounded border border-dashed border-elevated text-sm text-muted">
          'y' — slides vertically
          <Tooltip follow-cursor="y" placement="right">
            pinned to the right edge
          </Tooltip>
        </div>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        A freely floating tooltip cannot be hovered, so it never holds itself open. The
        single-axis forms stay pinned to one edge of the Anchor and can be.
      </p>
    </section>

    <!-- interactive -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Interactive Tooltip
      </h2>
      <ul class="flex w-72 flex-col gap-1">
        <li v-for="event in events" :key="event.id">
          <button
            class="w-full rounded border border-elevated px-3 py-2 text-left text-sm"
            @click="run(`opened ${event.id}`)"
          >
            {{ event.name }}
            <Tooltip v-slot="{ hide }" interactive placement="right">
              <p class="mb-2 text-xs text-muted">
                {{ event.time }}
              </p>
              <button class="btn btn-text-error btn-sm" @click="hide(); removeEvent(event.id)">
                <Icon name="i-mdi:trash-can-outline" />
                Delete
              </button>
            </Tooltip>
          </button>
        </li>
      </ul>
      <p v-if="!events.length" class="mt-2 text-xs text-muted">
        All deleted — reload to get them back.
      </p>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        It can be hovered into and it holds buttons. On touch a Tap opens it <em>instead
          of</em> activating the row, so <code>last action</code> stays put until you press
        Delete. <kbd>Escape</kbd> closes it.
      </p>
    </section>

    <!-- controlled and disabled -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Controlled &amp; disabled
      </h2>
      <div class="flex flex-wrap items-start gap-6">
        <div class="flex flex-col items-start gap-2">
          <span class="text-sm underline decoration-dotted">
            the anchor
            <Tooltip v-model="controlledOpen" placement="bottom">
              Opened from outside.
            </Tooltip>
          </span>
          <button class="btn btn-outline btn-sm" @click="controlledOpen = !controlledOpen">
            toggle v-model
          </button>
          <code data-testid="out-controlled" class="text-xs text-muted">
            open={{ controlledOpen }}
          </code>
          <p class="max-w-64 text-xs text-muted">
            <code>v-model</code> works alongside the Anchor's own listeners rather than
            instead of them: hovering off still closes it. <code>false</code> is emitted
            only once the leave transition has finished, which is why the flag lags the
            disappearance.
          </p>
        </div>

        <div class="flex flex-col items-start gap-2">
          <button class="btn btn-outline">
            hover me, then tick the box
            <Tooltip :disabled="tooltipDisabled">
              Disabling closes this while it is open.
            </Tooltip>
          </button>
          <label class="flex items-center gap-2 text-xs text-muted">
            <input v-model="tooltipDisabled" type="checkbox">
            disabled
          </label>
        </div>
      </div>
    </section>

    <!-- keyboard -->
    <section>
      <h2 class="mb-2 text-sm font-semibold">
        Keyboard
      </h2>
      <div class="flex flex-wrap items-center gap-3">
        <button class="btn btn-outline">
          first
          <Tooltip>Focus opens it, blur closes it.</Tooltip>
        </button>
        <button class="btn btn-outline">
          second
          <Tooltip>Tab between the two.</Tooltip>
        </button>
        <button class="btn btn-outline">
          third
          <Tooltip>Escape closes without moving focus.</Tooltip>
        </button>
      </div>
      <p class="mt-2 max-w-3xl text-xs text-muted">
        Tab through them. Focus opens a tooltip on the same terms as hover, and
        <kbd>Escape</kbd> closes it while leaving focus where it is.
      </p>
    </section>
  </div>
</template>
