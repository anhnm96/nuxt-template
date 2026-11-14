import { expect, test } from '@nuxt/test-utils/playwright'

/**
 * A release in the margin between two rows is a release on the list itself, and
 * the browser sends `drop` only to a target that cancels `dragover`. Only a real
 * drag shows this: a synthetic `drop` reaches its target whatever `dragover` did.
 *
 * Needs the app running on the host in `playwright.config.ts`.
 */
test('a drop in the margin between two rows moves the item', async ({ page, goto }) => {
  await goto('/playground/dnd', { waitUntil: 'hydration' })

  // the second demo: `reorder="placeholder"`, four rows with a margin between them
  const list = page.locator('.drag-list').nth(1)
  await list.scrollIntoViewIfNeeded()
  const rows = await list.evaluate(el =>
    [...el.children].map((row) => {
      const rect = row.getBoundingClientRect()
      return { x: rect.left + rect.width / 2, top: rect.top, bottom: rect.bottom }
    }))
  const first = rows[0]!
  const start = (first.top + first.bottom) / 2
  const margin = (rows[2]!.bottom + rows[3]!.top) / 2
  // the test proves nothing unless the rows have a margin to release in
  expect(rows[3]!.top - rows[2]!.bottom).toBeGreaterThan(2)

  await page.mouse.move(first.x, start)
  await page.mouse.down()
  for (let y = start; y < margin; y += 6) await page.mouse.move(first.x, y, { steps: 2 })
  await page.mouse.move(first.x, margin, { steps: 3 })
  await page.waitForTimeout(300)

  // the cursor is on the list, not on a row
  const under = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.className, [first.x, margin])
  expect(under).toContain('drag-list')

  await page.mouse.up()
  await page.waitForTimeout(400)

  const order = await list.evaluate(el => [...el.children].map(row => row.textContent.trim()))
  expect(order[0]).not.toBe('Write')
  expect(order).toContain('Write')
})
