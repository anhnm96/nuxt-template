import { expect, test } from '@playwright/test'

const tooltipUrl = new URL('/playground/tooltip', process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:3000').href

test('reactive single-line text changes recompute the natural surface width', async ({ page }) => {
  await page.goto(tooltipUrl)
  await page.evaluate(() => document.fonts.ready)
  await page.getByTestId('group-short').hover()
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  const content = surface.locator('.tooltip-group-content')
  await expect(surface).toBeVisible()
  await page.waitForTimeout(250)
  const original = await surface.boundingBox()
  const originalHeight = await content.evaluate(el => el.clientHeight)
  const input = page.getByTestId('group-live-hint')
  await input.evaluate((el: HTMLInputElement) => {
    el.value = 'Hi'
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(content).toHaveText('Hi')
  await expect.poll(async () => (await surface.boundingBox())!.width).toBeLessThan(original!.width - 20)
  expect(await content.evaluate(el => el.clientHeight)).toBe(originalHeight)
  const narrow = await surface.boundingBox()
  await input.evaluate((el: HTMLInputElement) => {
    el.value = 'Save'
    el.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await expect(content).toHaveText('Save')
  await expect.poll(async () => (await surface.boundingBox())!.width).toBeGreaterThan(narrow!.width + 10)
  expect(await content.evaluate(el => el.clientHeight)).toBe(originalHeight)
})

test('an explicit line break keeps both complete lines visible', async ({ page }) => {
  await page.goto(tooltipUrl)
  await page.evaluate(() => document.fonts.ready)
  await page.getByTestId('group-multiline').hover()
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  await expect(surface).toBeVisible()
  await page.waitForTimeout(300)
  const layout = await surface.evaluate((el) => {
    const content = el.querySelector<HTMLElement>('.tooltip-group-content')!
    const viewport = el.querySelector<HTMLElement>('.tooltip-group-viewport')!
    const tops = new Set<number>()
    for (const node of content.childNodes) {
      if (node.nodeType !== Node.TEXT_NODE || !node.textContent?.trim()) continue
      const range = document.createRange()
      range.selectNodeContents(node)
      for (const rect of range.getClientRects()) tops.add(Math.round(rect.top))
    }
    return { lines: tops.size, height: content.scrollHeight, visibleHeight: viewport.clientHeight }
  })
  expect(layout.lines).toBe(2)
  expect(layout.height).toBeLessThanOrEqual(layout.visibleHeight + 1)
})

test('a shared tooltip moves and resizes without replacing its surface', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(tooltipUrl)
  const short = page.getByTestId('group-short')
  const long = page.getByTestId('group-long')
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  await short.hover()
  await expect(surface).toBeVisible()
  await page.waitForTimeout(250)
  const first = await surface.boundingBox()
  expect(first!.width).toBeGreaterThan(40)
  await surface.evaluate(el => el.setAttribute('data-original', 'true'))
  await long.hover()
  await page.waitForTimeout(40)
  const middle = await surface.boundingBox()
  await expect(surface).toHaveAttribute('data-original', 'true')
  await page.waitForTimeout(200)
  const last = await surface.boundingBox()
  expect(last!.width).toBeGreaterThan(first!.width + 60)
  expect(middle!.width).toBeGreaterThan(first!.width)
  expect(middle!.width).toBeLessThan(last!.width)
  expect(Math.abs(last!.x - first!.x)).toBeGreaterThan(10)
  await expect(surface.locator('.tooltip-group-content')).toHaveCount(1)
  await expect(surface).toContainText('Save your changes without publishing them.')
  await expect(surface.locator('[role="tooltip"]')).toHaveCSS('opacity', '1')
  const anchor = await long.boundingBox()
  expect(last!.y + last!.height).toBeCloseTo(anchor!.y - 8, 0)
  expect(last!.y).toBeGreaterThan(0)
  await page.screenshot({ path: 'test-results/tooltip-group.png' })
  await page.getByTestId('group-multiline').hover()
  await page.waitForTimeout(220)
  const multiline = await surface.boundingBox()
  expect(multiline!.height).toBeGreaterThan(last!.height + 10)
  await page.getByTestId('group-side').hover()
  await page.waitForTimeout(220)
  await expect(surface.locator('.tooltip-group-arrow')).toHaveAttribute('data-side', 'bottom')
  await page.keyboard.press('Escape')
  await expect(surface).toHaveCount(0)
  expect(errors).toEqual([])
})

test('reduced motion switches immediately without outgoing content', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(tooltipUrl)
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  await page.getByTestId('group-short').hover()
  await expect(surface).toBeVisible()
  await page.getByTestId('group-long').hover()
  await expect(surface).toContainText('Save your changes')
  await expect(surface.locator('.tooltip-group-content')).toHaveCount(1)
  expect(await surface.evaluate(el => getComputedStyle(el).transitionDuration)).toBe('0s')
})

test('destination sizing wraps text and keeps the visible surface aligned', async ({ page }) => {
  await page.goto(tooltipUrl)
  const positioner = page.locator('[data-tooltip-group="playground-motion"]')
  const tooltip = positioner.locator('[role="tooltip"]')
  for (const [testId, width] of [['group-constrained', 150], ['group-fixed-width', 210]] as const) {
    const anchor = page.getByTestId(testId)
    await anchor.hover()
    await expect(tooltip).toBeVisible()
    await page.waitForTimeout(300)
    const box = await tooltip.boundingBox()
    const wrapperBox = await positioner.boundingBox()
    const anchorBox = await anchor.boundingBox()
    expect(box!.width).toBeCloseTo(width, 0)
    expect(wrapperBox!.width).toBeCloseTo(box!.width, 0)
    expect(box!.x + box!.width / 2).toBeCloseTo(anchorBox!.x + anchorBox!.width / 2, 0)
    const content = await tooltip.locator('.tooltip-group-content').evaluate(el => ({ width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight }))
    expect(content.scrollWidth).toBeLessThanOrEqual(content.width + 1)
    expect(content.height).toBeGreaterThan(24)
  }
})

test('text keeps its destination layout while the surface shrinks', async ({ page }) => {
  await page.goto(tooltipUrl)
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  await page.getByTestId('group-fixed-width').hover()
  await expect(surface).toBeVisible()
  await page.waitForTimeout(300)
  const before = await surface.locator('.tooltip-group-content').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))
  // Collect frames in the page so both text layers are measured before their fade ends.
  const samples = await page.evaluate(async () => {
    const anchor = document.querySelector('[data-testid="group-constrained"]')!
    anchor.dispatchEvent(new PointerEvent('pointerenter', { pointerType: 'mouse' }))
    const frames: { surfaceWidth: number, width: number, height: number, oldWidth: number, oldHeight: number }[] = []
    const start = performance.now()
    while (performance.now() - start < 120) {
      await new Promise<void>(resolve => requestAnimationFrame(() => resolve()))
      const surface = document.querySelector<HTMLElement>('[data-tooltip-group="playground-motion"]')!
      const current = surface.querySelector<HTMLElement>('.tooltip-group-incoming')
      const previous = surface.querySelector<HTMLElement>('.tooltip-group-previous')
      if (current && previous) frames.push({ surfaceWidth: surface.getBoundingClientRect().width, width: current.clientWidth, height: current.clientHeight, oldWidth: previous.clientWidth, oldHeight: previous.clientHeight })
    }
    return frames
  })
  expect(samples.length).toBeGreaterThan(2)
  expect(samples.some(sample => sample.surfaceWidth > 155 && sample.surfaceWidth < 205)).toBe(true)
  await page.waitForTimeout(200)
  const final = await surface.locator('.tooltip-group-content').evaluate(el => ({ width: el.clientWidth, height: el.clientHeight }))
  for (const sample of samples) {
    expect(sample.width).toBe(final.width)
    expect(sample.height).toBe(final.height)
    expect(sample.oldWidth).toBe(before.width)
    expect(sample.oldHeight).toBe(before.height)
  }
})

test('a handoff during exit reuses the surface and ignores stale close callbacks', async ({ page }) => {
  await page.goto(tooltipUrl)
  const surface = page.locator('[data-tooltip-group="playground-motion"]')
  await page.getByTestId('group-short').hover()
  await expect(surface).toBeVisible()
  await page.waitForTimeout(250)
  const original = await surface.locator('[role="tooltip"]').elementHandle()
  await page.mouse.move(1000, 100)
  await page.waitForTimeout(130)
  await page.getByTestId('group-long').hover()
  await expect(surface).toContainText('Save your changes')
  await page.waitForTimeout(250)
  expect(await original!.evaluate(el => el === document.querySelector('[data-tooltip-group="playground-motion"] [role="tooltip"]'))).toBe(true)
  await expect(surface.locator('[role="tooltip"]')).toHaveCSS('opacity', '1')
})
