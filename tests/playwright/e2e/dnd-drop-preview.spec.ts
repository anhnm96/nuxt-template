import type { Locator, Page } from '@playwright/test'
import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * The one seam with the fidelity to catch this bug class.
 *
 * A drop preview changes how tall a list is; a container scrolled to its end
 * answers that by scrolling, and the rows a landing spot is read from move with
 * no cursor behind them, so the spot flips, the gap retires, and round it goes.
 * Every ingredient of that is real layout: the browser's own scroll anchoring,
 * transforms counting towards the scrollable area, and a native drag session.
 * None of them exist in the unit environment, where every geometric fact is a
 * stub — two regressions in this area passed that suite and shipped anyway.
 *
 * The order of the two drags is the whole test. A first drag that lands an item
 * at the end of a list already scrolled there is what arms it; without that the
 * second drag is steady whether the fix is in or not, and this test passes for
 * the wrong reason. It was written that way first, and only caught the bug once
 * the arming drag was added.
 *
 * Needs the app running on the host in `playwright.config.ts`.
 */

interface RowBox { x: number, middle: number }
interface Layout {
  last: RowBox
  above: RowBox
  middling: RowBox
  bottomEdge: number
}

/**
 * Scrolls `list`'s container all the way down. A named step of its own, not
 * folded into reading the rows: the sampler installed between the two drags
 * must never see this container write scrollTop, or a frame it captures would
 * be this call's doing instead of the drag's.
 */
async function scrollToEnd(list: Locator) {
  await list.evaluate((el) => {
    el.closest<HTMLElement>('.overflow-y-auto')!.scrollTop
      = el.closest<HTMLElement>('.overflow-y-auto')!.scrollHeight
  })
}

/** where the rows of `list` sit right now, in viewport coordinates. Read-only. */
async function measureRows(list: Locator): Promise<Layout> {
  return list.evaluate((el) => {
    const scroller = el.closest<HTMLElement>('.overflow-y-auto')!
    const rows = [...el.querySelectorAll<HTMLElement>('.drag-container')]
    const box = (row: HTMLElement) => {
      const rect = row.getBoundingClientRect()
      return {
        x: Math.round(rect.left + rect.width / 2),
        middle: Math.round(rect.top + rect.height / 2),
      }
    }
    return {
      last: box(rows.at(-1)!),
      above: box(rows.at(-2)!),
      middling: box(rows[Math.floor(rows.length / 2)]!),
      bottomEdge: Math.round(scroller.getBoundingClientRect().bottom),
    }
  })
}

/** a real drag: the browser starts a session for real input, and not before a move */
async function startDrag(page: Page, x: number, y: number) {
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y - 4)
}

test('the list holds still while the drop preview opens at its end', async ({
  page,
  goto,
}) => {
  await goto('/dnd', { waitUntil: 'hydration' })

  // several demos on the page share `group="infinite"`, nothing to pick one of
  // them out by, so this drives the list a `data-testid` names instead. The
  // count is asserted so a changed demo fails loudly here rather than quietly
  // testing a different list
  const list = page.locator('[data-testid="drop-preview-demo"] .drag-list')
  await expect(list.locator('.drag-container')).toHaveCount(10)

  // the demo sits well down a long page, and a mouse only reaches what is in the
  // viewport: every box below is read after the page has been brought to it
  await list.scrollIntoViewIfNeeded()
  await scrollToEnd(list)

  // arming: a middling row down to the end of a list already scrolled there.
  // Resting near the bottom edge is what the auto-scroll answers by bringing the
  // tail into view, which is how the cursor reaches the far side of the last row
  const before = await measureRows(list)
  await startDrag(page, before.middling.x, before.middling.middle)
  for (let y = before.middling.middle; y < before.bottomEdge - 16; y += 12) {
    await page.mouse.move(before.middling.x, y, { steps: 2 })
  }
  await page.waitForTimeout(700)
  await page.mouse.up()
  await page.waitForTimeout(400)

  // the arming drag's own auto-scroll already ran the container to its end and
  // held it there, so this is not expected to move anything — it is here so the
  // sampler about to be installed starts from a known position rather than an
  // assumption about what the drag above left behind
  await scrollToEnd(list)

  // sample the scroll and the gap on every frame, keeping only what changed
  await list.evaluate((el) => {
    const scroller = el.closest<HTMLElement>('.overflow-y-auto')!
    const seen: { scroll: number, gap: boolean }[] = []
    ;(window as any).__samples = seen
    const tick = () => {
      const sample = {
        scroll: Math.round(scroller.scrollTop),
        gap: !!el.querySelector('.drag-placeholder'),
      }
      const prev = seen.at(-1)
      if (!prev || prev.scroll !== sample.scroll || prev.gap !== sample.gap) {
        seen.push(sample)
      }
      requestAnimationFrame(tick)
    }
    tick()
  })

  // the reported gesture: the last row, slowly, to the middle of the row above —
  // the one point where the landing spot is free to read either way, so any
  // nudge of the rows changes the answer
  const box = await measureRows(list)
  await startDrag(page, box.last.x, box.last.middle)
  for (let y = box.last.middle - 4; y >= box.above.middle; y -= 4) {
    await page.mouse.move(box.last.x, y, { steps: 2 })
  }

  // and rest there: the browser keeps firing dragover at a resting cursor, which
  // is all the loop ever needed to keep going
  for (let i = 0; i < 8; i++) {
    await page.mouse.move(box.last.x, box.above.middle)
    await page.waitForTimeout(100)
  }

  const samples: { scroll: number, gap: boolean }[]
    = await page.evaluate(() => (window as any).__samples)
  await page.mouse.up()

  const scrolls = new Set(samples.map(sample => sample.scroll))
  const gapFlips = samples.filter(
    (sample, i) => i > 0 && sample.gap !== samples[i - 1]!.gap,
  )

  // the drag really ran: without a gap the rest of this proves nothing
  expect(samples.some(sample => sample.gap)).toBe(true)
  // the list never moved under the cursor
  expect(scrolls.size).toBe(1)
  // and the preview opened once instead of flickering
  expect(gapFlips).toHaveLength(1)
})
