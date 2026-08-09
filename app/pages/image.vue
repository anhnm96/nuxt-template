<script setup lang="ts">
// Makes the emit counts observable — they should tick by exactly one per open or
// dismissal, however it is triggered.
const counts = reactive({ open: 0, close: 0 })

const photos = [
  { src: 'https://placecats.com/millie/800/600', alt: 'Millie the cat', caption: 'Millie, mid-loaf' },
  { src: 'https://placecats.com/neo/800/600', alt: 'Neo the cat', caption: 'Neo, unimpressed' },
  { src: 'https://placecats.com/bella/800/600', alt: 'Bella the cat' },
  { src: 'https://placecats.com/poppy/800/600', alt: 'Poppy the cat', caption: 'Poppy in the sun' },
]
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-10 p-8">
    <header class="space-y-1">
      <h1 class="text-2xl font-semibold">
        ImagePreview
      </h1>
      <p class="text-description">
        Click any image to expand it into a modal with a view transition. Close with the button,
        Esc, a click outside, or a scroll.
      </p>
    </header>

    <section class="grid grid-cols-2 gap-6 sm:grid-cols-3">
      <ImagePreview
        v-for="photo in photos"
        :key="photo.src"
        :src="photo.src"
        :alt="photo.alt"
        :caption="photo.caption"
        :width="800"
        :height="600"
      />
    </section>

    <section class="space-y-3">
      <h2 class="font-medium">
        Hi-res source in the expanded view
      </h2>
      <ImagePreview
        src="https://placecats.com/louie/600/400"
        preview-src="https://placecats.com/louie/1200/800"
        alt="Louie the cat"
        caption="Thumbnail is 600×400, the expanded view loads 1200×800"
        :width="600"
        :height="400"
        class="max-w-sm"
      />
    </section>

    <section class="space-y-3">
      <h2 class="font-medium">
        Open / close events
      </h2>
      <p class="text-description">
        opened {{ counts.open }} / closed {{ counts.close }} — exactly one per open and one per
        dismissal, however it is dismissed.
      </p>
      <ImagePreview
        src="https://placecats.com/neo_banana/500/375"
        alt="Neo with a banana"
        caption="Emits open and close"
        :width="500"
        :height="375"
        class="max-w-3xs"
        @open="counts.open++"
        @close="counts.close++"
      />
    </section>

    <section class="space-y-3">
      <h2 class="font-medium">
        Disabled + pass-through styling
      </h2>
      <div class="flex flex-wrap items-start gap-6">
        <ImagePreview
          src="https://placecats.com/g/400/300"
          alt="A cat that cannot be expanded"
          caption="disabled"
          disabled
          class="max-w-3xs"
        />
        <ImagePreview
          src="https://placecats.com/millie_neo/400/300"
          alt="Millie and Neo"
          caption="pt override"
          class="max-w-3xs"
          :pt="{ image: 'rounded-full border-4 border-primary', caption: 'font-semibold text-primary' }"
        />
      </div>
    </section>
  </div>
</template>
