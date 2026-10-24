# Grouped tooltip motion — design discussion

Status: implemented. This document records the agreed scope. Current usage and maintenance
contracts live in the tooltip [README](../../../app/components/base/tooltip/README.md) and
[design documentation](../../../app/components/base/tooltip/DESIGN.md).

## Agreed

- An optional `group` identifies a Tooltip Group. Members share one visible surface.
  Activating another member replaces the current member, including a pending hide.
  Different groups never morph into one another. Omitting `group` preserves current behavior.
- The surface animates position and dimensions while old and new content crossfade.
  Text does not stretch. Rapid changes redirect from the current visual position.
  Reduced motion switches immediately.
- Initial support covers ordinary, element-anchored tooltips. Interactive and
  cursor-following tooltips keep their existing rendering path.
- One `TooltipHost` in `app.vue` manages one surface per app-wide group name.
  Grouped motion initially requires `attachTo="body"`; custom destinations keep
  existing rendering and produce a development warning.
- Pointer departure allows a 100 ms handoff interval, or `hideDelay` if longer.
  Another member entered during that interval cancels closing and morphs immediately.
  After the surface finishes closing, the next open has no motion from its old position.
  The existing 300 ms Sweep delay shortcut is distinct from this handoff interval.
- Pointer and keyboard activation can morph while the previous surface remains present.
  Keyboard focus keeps its existing opening delay; `v-model` opens immediately.
  Touch keeps the existing press-and-hold policy without inter-anchor morphing.
- During replacement, the outgoing member emits `update:modelValue=false` when its
  outgoing content finishes fading. Its Anchor loses the tooltip description relationship
  immediately on handoff; outgoing content is visual only.

- The destination member supplies placement, offset, classes, and styles. The host owns
  a fixed 180 ms ease-out handoff. `animate` controls entrance and exit only. Custom
  colors and other styles switch to destination values without general CSS morphing.
- Only anchor changes animate position. Scrolling and viewport changes update placement
  immediately. A side change during handoff switches the arrow to the destination side
  while the surface moves and resizes.
- Escape, Anchor clicks, disabling, and Anchor removal bypass the handoff wait and begin
  closing immediately.
- Each member retains ownership of its slot content and reactive context. At most current
  and outgoing content are mounted. A third activation discards older outgoing content
  and completes its model cleanup immediately. Returning after content was removed mounts
  it afresh; no content state cache is provided.
- Interrupted transition callbacks must not close a new member or emit a stale `false`
  for a member that has reopened.

## Implementation scope

- Add the shared host and opt-in group coordination while preserving standalone behavior.
- Keep slot ownership, accessible description relationships, and member model cleanup
  correct across handoffs and interruptions.
- Extend tooltip tests for group isolation, timing, replacement, dismissal, reduced motion,
  unsupported combinations, and interrupted transitions.
- Add grouped examples to the tooltip playground and verify movement and resizing visually.
- Update component usage and design documentation after implementation. Clarify the Sweep
  glossary entry so its existing entrance-animation shortcut is distinct from group motion.

Reference: [Base UI tooltip animation](https://base-ui.com/react/components/tooltip#animating-the-tooltip).
