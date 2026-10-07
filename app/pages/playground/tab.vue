<script setup lang="ts">
// The bare name resolves to PrimeVue's deprecated Dropdown, so import this one by path.
import Dropdown from '~/components/base/dropdown/Dropdown.vue'

const VIEW_MODE = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  LIST: 'list',
  TIMELINE_DAY: 'timeline_day',
  USER_WEEK: 'user_week',
} as const

/** Views that do not earn a pill of their own. One tab owns all of them. */
const MORE_VIEWS = [
  { label: 'Timeline Day', value: VIEW_MODE.TIMELINE_DAY },
  { label: 'User Week', value: VIEW_MODE.USER_WEEK },
]

const MORE_VIEW_VALUES = MORE_VIEWS.map(view => view.value)

const viewMode = ref<string>(VIEW_MODE.DAY)

// Name the active view, so the tab never reads "More" while one of its views is open.
const moreLabel = computed(() =>
  MORE_VIEWS.find(view => view.value === viewMode.value)?.label ?? 'More',
)

const isMenuOpen = ref(false)

/**
 * Arrow keys move focus to another tab and would leave the menu open behind them.
 * An absent `relatedTarget` means the browser did not say where focus went — Safari and
 * Firefox report that for a mouse press on a menu item — so closing then would unmount
 * the item before its click lands. Dropdown's click-outside covers that case.
 *
 * Only the trigger is watched, so a keyboard exit from inside the menu leaves it open;
 * see docs/specs/tab/menu-in-a-tab-stays-open.md.
 */
function onMenuFocusOut(event: FocusEvent) {
  const next = event.relatedTarget as HTMLElement | null
  if (!next || next.closest('[data-slot="dropdown-popover"]')) return
  isMenuOpen.value = false
}

const panelView = ref('overview')

// One model per tablist, so the three panel modes can be compared side by side.
const plainView = ref('first')
const keptView = ref('first')
const eagerView = ref('first')

const verticalView = ref('general')
const verticalBlockView = ref('members')

const ACCESS_TABS = [
  { value: 'read', label: 'Read' },
  { value: 'write', label: 'Write', disabled: true },
  { value: 'share', label: 'Share', ariaDisabled: true },
  { value: 'admin', label: 'Admin' },
]
const accessView = ref('read')
</script>

<template>
  <div class="flex min-h-screen flex-col gap-12 p-8">
    <!-- view switcher: one tab owns two views, and its menu selects between them -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold">
        Multi-value tab
      </h2>
      <p class="max-w-prose text-xs text-muted">
        The last tab owns both custom views. It stays highlighted while either is active, and
        it does not select on click — its menu commits the value instead.
      </p>

      <Tabs v-model:value="viewMode" class="text-center">
        <TabList class="inline-flex gap-1 rounded-xl border border-elevated bg-surface/60 p-1 backdrop-blur-sm">
          <TabIndicator class="top-1/2 h-7 -translate-y-1/2 rounded-lg! border border-primary/30 bg-primary/15" />
          <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.DAY">
            Day
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.WEEK">
            Week
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.MONTH">
            Month
          </Tab>
          <Tab class="h-7 rounded-lg! py-1" :value="VIEW_MODE.LIST">
            List
          </Tab>

          <!-- one tab for several views; the menu selects which one applies -->
          <Dropdown v-model:open="isMenuOpen" placement="bottom">
            <Tab
              class="h-7 gap-1 rounded-lg! py-1"
              :value="MORE_VIEW_VALUES"
              @focusout="onMenuFocusOut"
            >
              {{ moreLabel }}
              <Icon name="mdi:chevron-down" size="16" />
            </Tab>

            <template #popover="{ toggleShow }">
              <div class="popover-list">
                <button
                  v-for="view in MORE_VIEWS" :key="view.value"
                  class="list-select-item w-full p-1.5 text-left"
                  :aria-current="viewMode === view.value"
                  @click="viewMode = view.value; toggleShow(false)"
                >
                  {{ view.label }}
                </button>
              </div>
            </template>
          </Dropdown>
        </TabList>
      </Tabs>

      <code data-testid="out-view" class="text-xs text-muted">{{ viewMode }}</code>
    </section>

    <!-- panels: a panel per tab, paired by value -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold">
        Tabs with panels
      </h2>
      <p class="max-w-prose text-xs text-muted">
        A panel names the same value as its tab. The two find each other by id, so neither
        call site writes one.
      </p>

      <div class="grid gap-8 md:grid-cols-2">
        <Tabs v-model:value="panelView" class="max-w-md">
          <TabList class="flex gap-2 border-b border-elevated">
            <TabIndicator />
            <Tab value="overview">
              Overview
            </Tab>
            <Tab value="activity">
              Activity
            </Tab>
            <Tab value="settings">
              Settings
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="overview" class="p-3 text-sm">
              Three sprints are open, and two close this week.
            </TabPanel>
            <TabPanel value="activity" class="p-3 text-sm">
              Mai moved four issues to review.
            </TabPanel>
            <TabPanel value="settings" class="p-3 text-sm">
              Notifications are on for mentions only.
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Tabs v-model:value="panelView" class="max-w-md">
          <div class="border-b border-elevated pb-1">
            <TabList class="flex gap-2">
              <TabIndicator class="h-full bg-primary/12" />
              <Tab value="overview">
                Overview
              </Tab>
              <Tab value="activity">
                Activity
              </Tab>
              <Tab value="settings">
                Settings
              </Tab>
            </TabList>
          </div>
          <TabPanels>
            <TabPanel value="overview" class="p-3 text-sm">
              Three sprints are open, and two close this week.
            </TabPanel>
            <TabPanel value="activity" class="p-3 text-sm">
              Mai moved four issues to review.
            </TabPanel>
            <TabPanel value="settings" class="p-3 text-sm">
              Notifications are on for mentions only.
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </section>

    <!-- the three panel modes, side by side, each with state to lose -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold">
        Default, <code>keepAlive</code> and <code>eager</code>
      </h2>
      <p class="max-w-prose text-xs text-muted">
        Type into the first panel of each, move to the second tab, then come back. The inputs
        bind nothing, so what survives is the panel's own DOM. By default a panel unmounts and
        the text goes with it. <code>keepAlive</code> caches the panel instead.
        <code>eager</code> mounts every panel at the start and only hides the inactive ones.
      </p>

      <div class="grid gap-6 md:grid-cols-3">
        <Tabs v-model:value="plainView">
          <p class="mb-1 text-xs font-medium">
            default
          </p>
          <TabList class="flex gap-2 border-b border-elevated">
            <TabIndicator />
            <Tab value="first">
              First
            </Tab>
            <Tab value="second">
              Second
            </Tab>
          </TabList>
          <TabPanels>
            <TabPanel value="first" class="p-3">
              <input data-testid="in-plain" class="inputtext w-full" placeholder="type here">
            </TabPanel>
            <TabPanel value="second" class="p-3 text-sm text-muted">
              Nothing to keep.
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Tabs v-model:value="keptView">
          <p class="mb-1 text-xs font-medium">
            keep-alive
          </p>
          <TabList class="flex gap-2 border-b border-elevated">
            <TabIndicator />
            <Tab value="first">
              First
            </Tab>
            <Tab value="second">
              Second
            </Tab>
          </TabList>
          <TabPanels keep-alive>
            <TabPanel value="first" class="p-3">
              <input data-testid="in-kept" class="inputtext w-full" placeholder="type here">
            </TabPanel>
            <TabPanel value="second" class="p-3 text-sm text-muted">
              Nothing to keep.
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Tabs v-model:value="eagerView">
          <p class="mb-1 text-xs font-medium">
            eager
          </p>
          <TabList class="flex gap-2 border-b border-elevated">
            <TabIndicator />
            <Tab value="first">
              First
            </Tab>
            <Tab value="second">
              Second
            </Tab>
          </TabList>
          <TabPanels eager>
            <TabPanel value="first" class="p-3">
              <input data-testid="in-eager" class="inputtext w-full" placeholder="type here">
            </TabPanel>
            <TabPanel value="second" class="p-3 text-sm text-muted">
              Nothing to keep.
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </section>

    <!-- vertical: the rule moves to the right edge, and the arrow keys swap -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold">
        Vertical
      </h2>
      <p class="max-w-prose text-xs text-muted">
        <code>vertical</code> sets <code>aria-orientation</code>, moves navigation onto the up
        and down arrows, and runs the indicator rule down the right edge instead of along the
        bottom. The second tablist asks for the block shape with <code>w-full</code>, the way
        a horizontal one asks with <code>h-full</code>.
      </p>

      <div class="grid gap-8 md:grid-cols-2">
        <Tabs v-model:value="verticalView" vertical class="flex gap-4">
          <TabList as="nav" class="flex w-40 shrink-0 flex-col gap-1 border-r border-elevated pr-2">
            <TabIndicator />
            <Tab value="general" class="justify-start">
              General
            </Tab>
            <Tab value="members" class="justify-start">
              Members
            </Tab>
            <Tab value="billing" class="justify-start">
              Billing
            </Tab>
          </TabList>

          <TabPanels>
            <TabPanel value="general" class="text-sm">
              The workspace is on the Europe region.
            </TabPanel>
            <TabPanel value="members" class="text-sm">
              Nine members, two of them admins.
            </TabPanel>
            <TabPanel value="billing" class="text-sm">
              The next invoice is raised on the first.
            </TabPanel>
          </TabPanels>
        </Tabs>

        <Tabs v-model:value="verticalBlockView" vertical class="flex gap-4">
          <div class="border-r border-elevated pr-2">
            <TabList as="nav" class="flex w-40 shrink-0 flex-col gap-1">
              <!-- the block shape, which needs a tint so the active label shows through -->
              <TabIndicator class="w-full rounded-lg! bg-primary/12" />
              <Tab value="general" class="justify-start">
                General
              </Tab>
              <Tab value="members" class="justify-start">
                Members
              </Tab>
              <Tab value="billing" class="justify-start">
                Billing
              </Tab>
            </TabList>
          </div>

          <TabPanels>
            <TabPanel value="general" class="text-sm">
              The workspace is on the Europe region.
            </TabPanel>
            <TabPanel value="members" class="text-sm">
              Nine members, two of them admins.
            </TabPanel>
            <TabPanel value="billing" class="text-sm">
              The next invoice is raised on the first.
            </TabPanel>
          </TabPanels>
        </Tabs>
      </div>
    </section>

    <!-- disabled tabs: both forms, and what the arrow keys do with them -->
    <section class="flex flex-col gap-3">
      <h2 class="text-sm font-semibold">
        Disabled tabs
      </h2>
      <p class="max-w-prose text-xs text-muted">
        Focus a tab and use the arrow keys. Navigation skips <strong>Write</strong>, which is
        <code>disabled</code>, and <strong>Share</strong>, which carries
        <code>aria-disabled</code>, so End lands on Admin. A <code>v-for</code> is fine over
        tabs; only panels have to be direct children of <code>TabPanels</code>.
      </p>

      <Tabs v-model:value="accessView" class="max-w-md">
        <TabList class="flex gap-2 border-b border-elevated">
          <TabIndicator />
          <Tab
            v-for="tab in ACCESS_TABS" :key="tab.value"
            :value="tab.value"
            :disabled="tab.disabled"
            :aria-disabled="tab.ariaDisabled"
            class="disabled:opacity-40 aria-disabled:opacity-40"
          >
            {{ tab.label }}
          </Tab>
        </TabList>
      </Tabs>

      <code data-testid="out-access" class="text-xs text-muted">{{ accessView }}</code>
    </section>
  </div>
</template>
