import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * `--trigger-width` cannot be checked anywhere but a real browser.
 *
 * `useElementSize` starts at 0 and reaches the real width only when ResizeObserver first
 * delivers. Every environment without a live rendering pipeline — the unit suite, and any
 * embedded preview pane that stalls `requestAnimationFrame` — therefore reports `0px`
 * forever, which reads exactly like a broken measurement and has already been mistaken for
 * one. The `0px` fallback is also invisible at small sizes, because every popup floors its
 * own width at 180px; only a trigger wider than that tells the two apart.
 *
 * Hence this test, and hence a Select: its control is the widest trigger in the library.
 */
test('the popover matches a trigger wider than the 180px floor', async ({ page, goto }) => {
  await goto('/playground/select', { waitUntil: 'hydration' })

  const trigger = page.locator('[data-slot="select-trigger"]').first()
  await trigger.click()
  await page.locator('[data-slot="select-popover"]').first().waitFor()

  // The enter transition runs from `scale-95` over 200ms, and a box measured while it plays
  // is the scaled one. Settle first, or every width here is short by the current scale.
  await page.waitForTimeout(400)

  const { controlWidth, triggerWidthVar, listWidth } = await page.evaluate(() => {
    const root = document.querySelector('[data-slot="select"]')
    const control = root?.firstElementChild as HTMLElement | null
    const positioned = document
      .querySelector('[data-slot="select-popover"]')
      ?.closest('.popovers > div') as HTMLElement | null
    const list = document.querySelector('.select-list') as HTMLElement | null
    return {
      controlWidth: control?.offsetWidth ?? 0,
      triggerWidthVar: positioned?.style.getPropertyValue('--trigger-width') ?? '',
      listWidth: list?.getBoundingClientRect().width ?? 0,
    }
  })

  // Guards the test itself: a narrow control would pass on the 180px floor alone.
  expect(controlWidth).toBeGreaterThan(180)

  const published = Number.parseFloat(triggerWidthVar)
  expect(published).toBeGreaterThan(180)
  // `content-box`, so the control's borders are excluded.
  expect(published).toBeCloseTo(controlWidth, -1)

  // `min-width` beats `max-width` in CSS, so the list follows the published width even past
  // the 25rem cap `select.css` also sets.
  expect(listWidth).toBeCloseTo(published, -1)
})
