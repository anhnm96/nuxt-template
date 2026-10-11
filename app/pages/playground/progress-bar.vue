<script setup lang="ts">
import ProgressBar from '~/components/base/progress/ProgressBar.vue'

const basic = ref(40)
const files = ref(4)
const upload = ref(0)
const failed = ref(false)

let timer: ReturnType<typeof setInterval> | undefined

/** Runs the bar the way a real upload does: in chunks, with gaps the transition smooths over. */
function runUpload() {
  clearInterval(timer)
  upload.value = 0
  failed.value = false

  timer = setInterval(() => {
    upload.value = Math.min(100, upload.value + Math.round(Math.random() * 25))
    if (upload.value === 100) clearInterval(timer)
  }, 600)
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="mx-auto flex max-w-2xl flex-col gap-10 p-8">
    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Default — 0.5rem, no readout
      </h2>
      <ProgressBar :value="basic" aria-label="Basic" />
      <input v-model.number="basic" type="range" min="0" max="100" class="w-full">
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Indeterminate — the value is simply absent
      </h2>
      <p class="text-sm opacity-70">
        No <code>indeterminate</code> prop: omitting <code>value</code> is what says the task
        is running and unmeasured. Set your OS to reduced motion and the segment stops
        travelling and pulses in place.
      </p>
      <ProgressBar aria-label="Loading" />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Zero is not indeterminate
      </h2>
      <p class="text-sm opacity-70">
        A known zero draws an empty Track and announces 0. The bar above announces nothing.
      </p>
      <ProgressBar :value="0" aria-label="Not started" />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Readout — drawn inside the Fill
      </h2>
      <p class="text-sm opacity-70">
        The Track grows to <code>1lh</code> to clear the text, and the Readout is clipped until
        the Fill is wide enough to hold it. Drag down to 5% to see that happen.
      </p>
      <ProgressBar :value="basic" show-readout aria-label="With a readout" />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        A slot, and a domain <code>max</code>
      </h2>
      <ProgressBar
        :value="files"
        :max="10"
        show-readout
        aria-label="Files uploaded"
        :format-value="(value, max) => `${value} of ${max} files`"
      >
        <template #default="{ value, max }">
          {{ value }} / {{ max }}
        </template>
      </ProgressBar>
      <p class="text-sm opacity-70">
        <code>formatValue</code> is what a screen reader hears — the Readout itself is
        presentational, because a progress bar's children always are.
      </p>
      <input v-model.number="files" type="range" min="0" max="10" class="w-full">
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Chunked values — what the transition is for
      </h2>
      <ProgressBar
        :value="upload"
        show-readout
        aria-label="Upload"
        :style="failed ? { '--progress-fill-color': 'var(--color-error)' } : undefined"
      />
      <div class="flex gap-2">
        <button class="btn btn-primary" @click="runUpload()">
          Run
        </button>
        <button class="btn btn-text" @click="failed = !failed">
          Toggle failure colour
        </button>
      </div>
      <p class="text-sm opacity-70">
        Colour is the consumer's: there is no <code>severity</code> prop, only
        <code>--progress-fill-color</code>.
      </p>
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Themed — the three properties
      </h2>
      <ProgressBar
        :value="70"
        aria-label="Themed"
        style="--progress-track-height: 1.25rem; --progress-track-color: var(--color-list-item-bg); --progress-fill-color: var(--color-highlight)"
      />
    </section>

    <section class="flex flex-col gap-2">
      <h2 class="font-medium">
        Out of range — clamped, marked, and warned about
      </h2>
      <p class="text-sm opacity-70">
        <code>value: 150</code> against the default <code>max</code>. The Fill is pinned at
        100%, the root carries <code>data-out-of-range</code>, and the console says so once.
      </p>
      <ProgressBar :value="150" aria-label="Out of range" />
    </section>
  </div>
</template>
