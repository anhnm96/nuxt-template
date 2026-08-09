<script lang="ts">
import type { ButtonHTMLAttributes, HTMLAttributes, ImgHTMLAttributes } from 'vue'

export interface ImagePreviewProps {
  src: string
  /** Higher-resolution source used only in the expanded view. Defaults to `src`. */
  previewSrc?: string
  alt?: string
  width?: number | string
  height?: number | string
  /** Rendered as a `<figcaption>` below the image, inline and in the expanded view. */
  caption?: string
  loading?: 'lazy' | 'eager'
  /** Renders the image without the expand affordance. */
  disabled?: boolean
  /** Close the expanded view when the user scrolls, like Medium does. */
  closeOnScroll?: boolean
  /** Accessible name of the expand button. */
  zoomLabel?: string
  closeLabel?: string
  /** Accessible name of the expanded dialog, used only when `alt` is empty and there is no caption. */
  dialogLabel?: string
  pt?: Pt<{
    image: ImgHTMLAttributes
    button: ButtonHTMLAttributes
    dialog: HTMLAttributes
    panel: HTMLAttributes
    caption: HTMLAttributes
  }>
}

/**
 * Runs `callback` in a view transition and resolves once it settles.
 *
 * Falls back to a plain call where View Transitions are unsupported. A skipped or
 * aborted transition (hidden tab, overlapping transition) rejects every promise the
 * transition exposes, so all three are swallowed — the DOM update has already
 * happened by then, and an unattached `ready` would surface as an unhandled
 * rejection. Callers must still run their post-transition cleanup.
 */
async function startTransition(callback: () => void | Promise<void>) {
  if (!document.startViewTransition) {
    await callback()
    return
  }
  const transition = document.startViewTransition(callback)
  const noop = () => {}
  transition.ready.catch(noop)
  transition.updateCallbackDone.catch(noop)
  await transition.finished.catch(noop)
}
</script>

<script setup lang="ts">
const props = withDefaults(defineProps<ImagePreviewProps>(), {
  alt: '',
  loading: 'lazy',
  disabled: false,
  closeOnScroll: true,
  zoomLabel: 'Expand image',
  closeLabel: 'Close',
  dialogLabel: 'Image preview',
})

const emit = defineEmits<{
  open: []
  close: []
}>()

const slots = defineSlots<{
  /** Replaces the hover affordance. Rendered once. */
  overlay?: () => any
  /**
   * Replaces the `caption` prop.
   *
   * Rendered in *both* the inline and expanded captions, and while expanded both
   * exist at once — the inline one is only `visibility: hidden`, which keeps it out
   * of the accessibility tree and out of tab order but leaves it in the DOM to hold
   * its space. Keep the content presentational: an `id` inside would be duplicated,
   * and a stateful component would be instantiated twice.
   */
  caption?: () => any
}>()

/** A caption is the most descriptive name available, so it labels the dialog when present. */
const hasCaption = computed(() => Boolean(props.caption || slots.caption))

/**
 * Whether the expanded view is on screen. Owned entirely by this component —
 * `expand()`/`collapse()` are the only writers, exposed for programmatic control.
 *
 * Flipped inside the transition callback rather than before it, so the outgoing
 * snapshot still contains the visible thumbnail for the morph to start from.
 */
const shown = shallowRef(false)

const dialogRef = useTemplateRef<HTMLDialogElement>('dialogRef')
const thumbRef = useTemplateRef<HTMLImageElement>('thumbRef')
const panelRef = useTemplateRef<HTMLImageElement>('panelRef')
const triggerRef = useTemplateRef<HTMLButtonElement>('triggerRef')
const closeRef = useTemplateRef<HTMLButtonElement>('closeRef')
const affordanceRef = useTemplateRef<HTMLElement>('affordanceRef')
const thumbCaptionRef = useTemplateRef<HTMLElement>('thumbCaptionRef')
const panelCaptionRef = useTemplateRef<HTMLElement>('panelCaptionRef')

// `useId()` is unique per component instance, so several previews can live on the
// same page without their view transition names colliding.
const uid = useId().replace(/\W/g, '-')

/** Only ever applied to the panel caption, so it stays unique despite the slot rendering twice. */
const labelId = `image-preview-label-${uid}`

const reducedMotion = usePreferredReducedMotion()
const animated = computed(() => reducedMotion.value !== 'reduce')

/** Runs `callback`, animated or not depending on the user's motion preference. */
async function transition(callback: () => void | Promise<void>) {
  if (!animated.value) {
    await callback()
    return
  }
  await startTransition(callback)
}

/**
 * The three elements that exist on both sides of the transition, each paired with
 * its expanded-view counterpart. The control pairs matter as much as the image: an
 * unnamed close button belongs to the root snapshot, so it cross-fades in at its
 * final position while the image is still travelling. Named, it morphs out of the
 * expand affordance instead — same size, same corner, so it simply glides.
 */
function transitionPairs() {
  return [
    { name: `image-preview-${uid}`, thumb: thumbRef.value, panel: panelRef.value },
    { name: `image-preview-control-${uid}`, thumb: affordanceRef.value, panel: closeRef.value },
    { name: `image-preview-caption-${uid}`, thumb: thumbCaptionRef.value, panel: panelCaptionRef.value },
  ]
}

/** Hands every transition name to one side of the pair, or clears them all. */
function claimNames(side: MaybeNull<'thumb' | 'panel'>) {
  if (!animated.value) return
  for (const { name, thumb, panel } of transitionPairs()) {
    if (thumb) thumb.style.viewTransitionName = side === 'thumb' ? name : ''
    if (panel) panel.style.viewTransitionName = side === 'panel' ? name : ''
  }
}

/** Intrinsic size of the expanded source, learned while decoding it. */
const panelSize = shallowRef<{ width: number, height: number }>()

/**
 * Decodes the expanded-view source before the transition starts, so a larger
 * `previewSrc` can't pop in or reflow mid-flight. Bounded, so a slow network
 * delays the open by at most a moment rather than indefinitely.
 *
 * Recording the intrinsic size matters as much as the decode: the panel image
 * mounts inside the transition callback, and without dimensions its box is
 * indefinite at the moment the new snapshot is captured — so the group animates
 * toward the wrong rect and snaps when the real layout lands.
 *
 * Measured both when the decode resolves and again after the race, so a decode that
 * loses to the timeout still contributes whatever the image already knows. If it
 * knows nothing yet, the template falls back to the `width`/`height` props, which
 * describe the same picture and so give the box the right shape regardless.
 */
async function preloadPanel() {
  const image = new Image()
  image.src = props.previewSrc || props.src

  const measure = () => {
    if (image.naturalWidth) {
      panelSize.value = { width: image.naturalWidth, height: image.naturalHeight }
    }
  }

  await Promise.race([image.decode().then(measure).catch(() => {}), sleep(300)])
  measure()
}

/**
 * Held for the length of a transition, and checked synchronously.
 *
 * `shown` cannot serve as the guard on its own: it only settles a frame later,
 * inside the transition callback, so every event arriving before then would pass a
 * `shown`-based check. That matters because dismissal is driven by high-frequency
 * events — one trackpad gesture fires dozens of `wheel` events, one swipe dozens of
 * `touchmove` — each of which would otherwise start a transition that aborts the
 * one before it, leaving the close un-animated.
 */
let running = false

async function expand() {
  if (props.disabled || running || shown.value) return
  running = true
  try {
    await preloadPanel()

    claimNames('thumb') // captured as the "old" snapshot

    await transition(async () => {
      shown.value = true
      await nextTick() // Vue renders the dialog contents asynchronously
      dialogRef.value?.showModal()
      claimNames('panel')
    })

    claimNames(null) // a name left behind would join any unrelated transition
    closeRef.value?.focus()
    emit('open')
  } finally {
    running = false
  }
}

async function collapse() {
  if (running || !shown.value) return
  running = true
  try {
    claimNames('panel')

    await transition(async () => {
      claimNames('thumb')
      dialogRef.value?.close()
      shown.value = false
      await nextTick()
    })

    claimNames(null)
    triggerRef.value?.focus()
    emit('close')
  } finally {
    running = false
  }
}

/**
 * A click landing on the dialog element itself came from the backdrop, or from the
 * area beside the image — either way, outside the content.
 */
function onDialogClick(event: MouseEvent) {
  if (event.target === dialogRef.value) collapse()
}

defineExpose({ expand, collapse })
</script>

<template>
  <figure
    class="group relative"
    :data-expanded="shown || undefined"
  >
    <img
      ref="thumbRef"
      v-bind="getPtValue(pt, 'image')"
      data-slot="image"
      class="image-preview-img block h-auto w-full rounded-lg data-expanded:invisible"
      :class="[!disabled && 'cursor-zoom-in']"
      :src
      :alt
      :width
      :height
      :loading
      :data-expanded="shown || undefined"
    >

    <button
      v-if="!disabled"
      ref="triggerRef"
      v-bind="getPtValue(pt, 'button')"
      data-slot="button"
      type="button"
      class="absolute inset-0 cursor-zoom-in rounded-lg data-expanded:invisible"
      :aria-label="zoomLabel"
      :aria-expanded="shown"
      :data-expanded="shown || undefined"
      @click="expand"
    >
      <!--
        The wrapper carries the ref and the transition name so a custom `overlay`
        still morphs into the close button; only its appearance is the slot's.
      -->
      <span
        ref="affordanceRef"
        class="image-preview-control absolute top-2 right-2 hidden opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-fine:block"
        aria-hidden="true"
      >
        <slot name="overlay">
          <span class="flex size-8 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Icon name="lucide:maximize-2" class="text-sm" />
          </span>
        </slot>
      </span>
    </button>

    <!--
      Ahead of the `figcaption` on purpose: the HTML content model requires a
      `figcaption` to be its figure's first or last child, and this dialog has to
      live inside the component's single root. It is moved to the top layer on
      open, so its position here has no bearing on where it renders.
    -->
    <dialog
      ref="dialogRef"
      v-bind="getPtValue(pt, 'dialog')"
      class="image-preview-dialog"
      data-slot="dialog"
      :aria-label="hasCaption ? undefined : (alt || dialogLabel)"
      :aria-labelledby="hasCaption ? labelId : undefined"
      @cancel.prevent="collapse"
      @keydown.esc.prevent="collapse"
      @click="onDialogClick"
      @wheel.passive="closeOnScroll && collapse()"
      @touchmove.passive="closeOnScroll && collapse()"
    >
      <figure
        v-if="shown" v-bind="getPtValue(pt, 'panel')"
        data-slot="panel"
        class="relative m-0 mx-auto w-fit"
      >
        <!--
          `w-auto` + `max-w-full` + `max-h` keeps the box aspect identical to the
          thumbnail's under both constraints. `w-full` + `max-h` would clamp the
          height while the width stayed full, distorting the box the transition
          morphs into. Dimensions prefer the decoded source, so a hi-res
          `previewSrc` sizes from its own — the thumbnail's props are only a
          fallback for when the decode hasn't resolved in time.
        -->
        <img
          ref="panelRef"
          class="image-preview-img block h-auto max-h-[85svh] w-auto max-w-full cursor-zoom-out rounded-lg"
          :src="previewSrc || src"
          :alt
          :width="panelSize?.width ?? width"
          :height="panelSize?.height ?? height"
          @click="collapse"
        >

        <button
          ref="closeRef"
          type="button"
          class="image-preview-control btn btn-icon absolute top-2 right-2 rounded-full bg-black/55 text-white backdrop-blur-sm hover:bg-black/75"
          @click="collapse"
        >
          <span class="sr-only">{{ closeLabel }}</span>
          <Icon name="ph:x-bold" />
        </button>

        <figcaption
          v-if="hasCaption"
          :id="labelId"
          ref="panelCaptionRef"
          class="image-preview-control mt-2 text-center text-sm text-white/90 drop-shadow"
        >
          <slot name="caption">
            {{ caption }}
          </slot>
        </figcaption>
      </figure>
    </dialog>

    <figcaption
      v-if="hasCaption"
      ref="thumbCaptionRef"
      data-slot="caption"
      v-bind="getPtValue(pt, 'caption')"
      class="image-preview-control mt-2 text-center text-sm text-muted data-expanded:invisible"
      :data-expanded="shown || undefined"
    >
      <slot name="caption">
        {{ caption }}
      </slot>
    </figcaption>
  </figure>
</template>

<style>
/*
 * Unscoped on purpose: `::view-transition-*` pseudo-elements live on the document
 * root, outside any component's scope. Every selector is class-namespaced so it
 * cannot leak onto other dialogs.
 */
.image-preview-img {
  view-transition-class: image-preview;
}

/*
 * The expand affordance, the close button and both captions. These keep the
 * default cross-fade — unlike the image, each side is genuinely different
 * content — but share the image's timing so everything travels together.
 */
.image-preview-control {
  view-transition-class: image-preview-control;
}

::view-transition-group(.image-preview),
::view-transition-group(.image-preview-control) {
  animation-duration: 0.35s;
  animation-timing-function: var(--ease-spring-1);
}

.image-preview-dialog {
  margin: auto;
  width: 100%;
  max-width: min(60rem, 100% - 2rem);
  max-height: calc(100svh - 2rem);
  overflow: visible;
  border: none;
  padding: 0;
  background: none;

  /*
   * No `backdrop-filter` here: blurring the full viewport for the length of the
   * transition is expensive enough to drop frames on a large display, and the
   * cost scales with the screen, not the image.
   */
  &::backdrop {
    background: rgb(0 0 0 / 0.6);
  }
}

/* Native modal dialogs still let the page behind scroll in some browsers. */
html:has(.image-preview-dialog[open]) {
  overflow: hidden;
}
</style>
