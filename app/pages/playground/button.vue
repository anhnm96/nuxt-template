<script setup lang="ts">
import Button from '~/components/base/button/Button.vue'

const { copy, copied } = useClipboard()
const { show } = useToast()
watch(copied, (value) => {
  if (value) show({ severity: 'success', description: 'Copied' })
})

/** The severities button.css publishes, in the order it declares them. */
const severities = ['primary', 'info', 'success', 'warn', 'error'] as const

const solid = [...severities.map(s => `btn-${s}`), 'btn-neutral']
const text = ['btn-text', ...severities.map(s => `btn-text-${s}`)]
const outline = ['btn-outline', ...severities.map(s => `btn-outline-${s}`)]

const variantRows = [
  { label: '.btn-{severity}', sample: 'btn btn-primary', classes: solid },
  { label: '.btn-text-{severity}', sample: 'btn btn-text-primary', classes: text },
  { label: '.btn-outline-{severity}', sample: 'btn btn-outline-primary', classes: outline },
  { label: '.btn-link', sample: 'btn btn-link', classes: ['btn-link', 'btn-link text-sky-500'] },
]

/** Pressed fills a ghost variant with its own accent and deepens a solid one. */
const pressedClasses = ['btn-text', 'btn-text-error', 'btn-outline', 'btn-primary', 'btn-neutral']

/** An empty size is the default padding, so the table shows it beside the named sizes. */
const sizeRows = [
  { label: '.btn-sm', size: 'btn-sm' },
  { label: '.btn (default)', size: '' },
  { label: '.btn-lg', size: 'btn-lg' },
  { label: '.btn-xl', size: 'btn-xl' },
]

const stateClasses = ['btn-primary', 'btn-neutral', 'btn-outline', 'btn-text']

/** Strips the variant prefix so a row of six reads as its severities. */
function shortLabel(cls: string) {
  return cls.replace(/^btn-(?:text-|outline-)?/, '') || 'base'
}

/** Counts prove the click guard: a blocked button leaves its count alone. */
const clicks = reactive({ live: 0, ariaDisabled: 0, bareAria: 0, loading: 0, submits: 0 })

const saving = ref(false)
const expanded = ref(false)
const withIcon = ref(true)

/** Runs long enough to read the spinner and try clicking through it. */
function save() {
  clicks.loading++
  saving.value = true
  setTimeout(() => (saving.value = false), 1500)
}
</script>

<template>
  <div class="flex flex-col gap-8 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Appearance comes from the stylesheet; the component has no variant prop
      </h2>
      <div class="grid-table with-label">
        <template v-for="row in variantRows" :key="row.label">
          <div>
            <button class="w-full text-left" @click="copy(row.sample)">
              {{ row.label }}
              <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
                {{ copied ? 'Copied!' : 'Copy' }}
              </Tooltip>
            </button>
          </div>
          <div>
            <div class="flex flex-wrap items-center gap-4">
              <Button
                v-for="cls in row.classes"
                :key="cls"
                :class="cls"
                :label="shortLabel(cls)"
              />
            </div>
          </div>
        </template>

        <div>
          <button class="w-full text-left" @click="copy('aria-pressed')">
            [aria-pressed="true"]
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              v-for="cls in pressedClasses"
              :key="cls"
              :class="cls"
              aria-pressed="true"
              :label="shortLabel(cls)"
            />
          </div>
        </div>
      </div>
      <p class="text-description">
        A plain <code>button class="btn btn-primary"</code> renders identically. The pressed row
        is the hook <NuxtLink class="underline" to="/playground/toggle-button">
          ToggleButton
        </NuxtLink>
        renders; a button that is not a toggle never carries the attribute.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A size class wins over a variant class, in either order
      </h2>
      <div class="grid-table with-label">
        <template v-for="row in sizeRows" :key="row.label">
          <div>
            <button class="w-full text-left" @click="copy(`btn btn-primary ${row.size}`.trim())">
              {{ row.label }}
              <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
                {{ copied ? 'Copied!' : 'Copy' }}
              </Tooltip>
            </button>
          </div>
          <div>
            <div class="flex flex-wrap items-end gap-4">
              <Button class="btn-primary" :class="[row.size]" label="Solid" />
              <Button class="btn-text" :class="[row.size]" label="Text, reversed" />
              <Button class="btn-outline" :class="[row.size]" label="Outline" />
              <Button class="btn-primary" :class="[row.size]" label="Icon" icon="ph:check" />
            </div>
          </div>
        </template>

        <div>
          <button class="w-full text-left" @click="copy('btn btn-primary btn-icon')">
            .btn-icon
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              v-for="cls in stateClasses"
              :key="cls"
              class="btn-icon" :class="[cls]"
              icon="ph:magnifying-glass"
              :aria-label="`Search, ${shortLabel(cls)}`"
            />
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        The default icon leads, a trailing icon follows, and a button may carry both
      </h2>
      <div class="grid-table with-label">
        <div>
          <button class="w-full text-left" @click="copy('icon=&quot;ph:check&quot;')">
            icon
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button class="btn-primary" label="Save" icon="ph:check" />
            <Button class="btn-outline" label="Delete" icon="ph:trash" />
            <Button class="btn-text" label="Search" icon="ph:magnifying-glass" />
          </div>
        </div>

        <div>
          <button
            class="w-full text-left"
            @click="copy('trailing-icon=&quot;tabler:chevron-down&quot;')"
          >
            trailing-icon
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              class="btn-outline"
              label="Show more"
              :trailing-icon="{ name: 'tabler:chevron-down', class: ['motion-safe:transition-transform', expanded ? 'rotate-180' : ''] }"
              @click="expanded = !expanded"
            />
            <Button class="btn-link" label="Open" trailing-icon="mingcute:download-2-line" />
          </div>
        </div>

        <div>
          <button class="w-full text-left" @click="copy('icon trailing-icon')">
            both
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              class="btn-outline"
              label="Download"
              icon="file-icons:microsoft-excel"
              trailing-icon="mingcute:download-2-line"
            />
          </div>
          <p class="mt-2 text-description">
            One position enum could not express this button.
          </p>
        </div>

        <div>
          <button class="w-full text-left" @click="copy(':icon=&quot;{ name, size, class }&quot;')">
            icon object
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button class="btn-primary" label="No size" icon="ph:check" />
            <Button class="btn-primary" label="Size 20" :icon="{ name: 'ph:check', size: 20 }" />
            <Button
              class="btn-primary"
              label="With class"
              :icon="{ name: 'ph:check', class: 'text-xl rotate-12' }"
            />
          </div>
        </div>

        <div>
          <button class="w-full text-left" @click="copy('btn btn-primary btn-icon')">
            padding trim
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button class="btn-neutral" label="No icon" />
            <Button class="btn-neutral" label="Leading" icon="ph:check" />
            <Button class="btn-neutral" label="Trailing" trailing-icon="ph:check" />
            <Button class="btn-neutral" label="Both" icon="ph:check" trailing-icon="ph:check" />
            <Button class="btn-neutral btn-icon" icon="ph:check" aria-label="Icon only" />
          </div>
          <p class="mt-2 text-description">
            Each icon trims its own side to 13px against the label side's 17px. An icon with no
            label gets neither margin, so the icon-only button stays square.
          </p>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        States apply to every variant
      </h2>
      <div class="grid-table with-label">
        <div>
          <button class="w-full text-left" @click="copy('loading')">
            :loading
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              v-for="cls in stateClasses"
              :key="cls"
              class="min-w-24" :class="[cls]"
              :label="shortLabel(cls)"
              loading
            />
            <Button class="btn-primary btn-icon" icon="ph:check" loading aria-label="Saving" />
          </div>
        </div>

        <div>
          <button class="w-full text-left" @click="copy('aria-disabled=&quot;true&quot;')">
            aria-disabled
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              v-for="cls in stateClasses"
              :key="cls"
              :class="cls"
              :label="shortLabel(cls)"
              aria-disabled="true"
            />
          </div>
        </div>

        <div>
          <button class="w-full text-left" @click="copy('disabled')">
            disabled
            <Tooltip :delay="0" class="rounded-md px-2 py-1 text-xs">
              {{ copied ? 'Copied!' : 'Copy' }}
            </Tooltip>
          </button>
        </div>
        <div>
          <div class="flex flex-wrap items-center gap-4">
            <Button
              v-for="cls in stateClasses"
              :key="cls"
              :class="cls"
              :label="shortLabel(cls)"
              disabled
            />
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Loading covers the content, marks the button busy, and swallows the click
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <Button
          class="btn-primary min-w-32"
          label="Save"
          icon="ph:check"
          :loading="saving"
          loading-msg="Saving, please wait"
          @click="save"
        />
        <code class="text-xs">handler ran {{ clicks.loading }}×</code>
      </div>
      <p class="text-description">
        While loading the label leaves the accessibility tree, so the loading message becomes
        the button's name. Clicking through the spinner does not raise the count.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Only aria-disabled="true" blocks the click, because that is what the stylesheet dims
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <Button class="btn-primary" label="Live" @click="clicks.live++" />
        <code class="text-xs">{{ clicks.live }}×</code>

        <Button
          class="btn-primary"
          label="aria-disabled true"
          aria-disabled="true"
          @click="clicks.ariaDisabled++"
        />
        <code class="text-xs">{{ clicks.ariaDisabled }}×</code>

        <Button
          class="btn-primary"
          label="bare aria-disabled"
          aria-disabled=""
          @click="clicks.bareAria++"
        />
        <code class="text-xs">{{ clicks.bareAria }}×</code>
      </div>
      <p class="text-description">
        The bare attribute renders as an empty string. It neither dims nor blocks, so the two
        never disagree. A disabled-looking button that silently drops clicks is the failure
        this rule prevents.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        The root is type="button", so a form submits only when asked
      </h2>
      <form class="flex flex-wrap items-center gap-4" @submit.prevent="clicks.submits++">
        <Button class="btn-outline" label="Does not submit" />
        <Button class="btn-primary" label="Submits" type="submit" />
        <code class="text-xs">submitted {{ clicks.submits }}×</code>
      </form>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        RTL — no override exists; the margins travel on the inline axis
      </h2>
      <div dir="rtl" class="flex flex-wrap items-center gap-4">
        <Button class="btn-primary" label="حفظ" icon="ph:check" />
        <Button class="btn-outline" label="عرض المزيد" trailing-icon="tabler:chevron-down" />
        <Button
          class="btn-neutral"
          label="كلاهما"
          icon="ph:check"
          trailing-icon="tabler:chevron-down"
        />
      </div>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        The default slot replaces the label and both icons
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <Button class="btn-link text-primary!" label="ignored" icon="ph:check">
          <Icon name="file-icons:microsoft-excel" class="text-xl" />
          <span>Download excel</span>
          <Icon name="mingcute:download-2-line" class="text-xl" />
        </Button>
      </div>
      <p class="text-description">
        Slot children are spaced by gap-1 alone, so they sit closer than prop icons and get no
        padding trim.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        An icon appearing moves the label, and justify-start anchors only a trailing one
      </h2>
      <div class="flex flex-wrap items-center gap-4">
        <Button class="btn-outline w-40" label="Lead" :icon="withIcon ? 'ph:check' : undefined" />
        <Button
          class="btn-outline w-40 justify-start"
          label="Lead, start"
          :icon="withIcon ? 'ph:check' : undefined"
        />
        <Button
          class="btn-outline w-40"
          label="Trail"
          :trailing-icon="withIcon ? 'ph:check' : undefined"
        />
        <Button
          class="btn-outline w-40 justify-start"
          label="Trail, start"
          :trailing-icon="withIcon ? 'ph:check' : undefined"
        />
        <Button
          class="btn-text"
          :label="withIcon ? 'Remove the icons' : 'Add the icons'"
          @click="withIcon = !withIcon"
        />
      </div>
      <p class="text-description">
        All four are 160px wide. Centred, the label moves about 8px either way. With
        justify-start a trailing icon holds the label still, and a leading icon moves it twice
        as far, because the icon then sits between the leading padding and the label.
      </p>
    </section>
  </div>
</template>
