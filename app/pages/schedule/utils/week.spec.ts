import type { ScheduleEventUI } from '~/services/schedule'
import type { DayColumn } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { describe, expect, it } from 'vitest'
import { EVENT_LAYOUT } from '~/utils/schedule'
import {
  buildAllDayBars,
  buildWeekSegments,
  countHiddenPerColumn,
  isPromotedToAllDay,
  MINUTES_PER_DAY,
  placeSegments,
} from './week'

const FULL_DAY = { startHour: 0, endHour: 23 }

/** Three consecutive days starting Mon 2026-06-15. */
function makeDays(count = 3, from = '2026-06-15'): DayColumn[] {
  return Array.from({ length: count }, (_, index) => {
    const date = dayjs(from).add(index, 'day')
    return {
      key: date.format('YYYY-MM-DD'),
      label: date.format('ddd'),
      date: date.format('D'),
      dayjs: date,
      isToday: false,
    }
  })
}

/** Dates are written as strings here; `ScheduleEventUI` carries them as ms. */
type EventDraft = Omit<Partial<ScheduleEventUI>, 'start' | 'end'> & { start: string, end: string }

function makeEvent(partial: EventDraft): ScheduleEventUI {
  return {
    id: partial.id ?? 'e1',
    title: partial.title ?? 'Event',
    resourceId: partial.resourceId ?? 'cal-1',
    color: partial.color ?? 'red',
    calendarTitle: partial.calendarTitle ?? 'Calendar',
    timed: partial.timed ?? true,
    ...partial,
    start: dayjs(partial.start).valueOf(),
    end: dayjs(partial.end).valueOf(),
  }
}

describe('buildWeekSegments', () => {
  it('keeps a same-day event as a single segment with real edges', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T09:00', end: '2026-06-15T10:30' })],
      makeDays(),
      FULL_DAY,
    )

    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({
      dayIndex: 0,
      startMin: 540,
      endMin: 630,
      continuesBefore: false,
      continuesAfter: false,
      fullyVisible: true,
    })
  })

  it('splits an overnight event into one segment per day', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T23:00', end: '2026-06-16T02:00' })],
      makeDays(),
      FULL_DAY,
    )

    expect(segments).toHaveLength(2)
    expect(segments[0]).toMatchObject({
      dayIndex: 0,
      startMin: 23 * 60,
      endMin: MINUTES_PER_DAY,
      continuesBefore: false,
      continuesAfter: true,
    })
    expect(segments[1]).toMatchObject({
      dayIndex: 1,
      startMin: 0,
      endMin: 120,
      continuesBefore: true,
      continuesAfter: false,
    })
    // Both halves are on screen, so the event can still be moved as a whole.
    expect(segments.every(segment => segment.fullyVisible)).toBe(true)
  })

  it('gives every segment of one event a distinct key', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ id: 'x', start: '2026-06-15T23:00', end: '2026-06-16T02:00' })],
      makeDays(),
      FULL_DAY,
    )

    expect(new Set(segments.map(segment => segment.key)).size).toBe(2)
  })

  it('gives a zero-length event a minimum body', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T09:00', end: '2026-06-15T09:00' })],
      makeDays(),
      FULL_DAY,
    )

    expect(segments[0]).toMatchObject({ startMin: 540, endMin: 555 })
  })

  it('drops the part of an event outside the visible hours and marks it clipped', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T06:00', end: '2026-06-15T09:00' })],
      makeDays(),
      { startHour: 8, endHour: 17 },
    )

    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({
      startMin: 480,
      endMin: 540,
      continuesBefore: true,
      fullyVisible: false,
    })
  })

  it('omits an event that falls entirely outside the visible hours', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T02:00', end: '2026-06-15T03:00' })],
      makeDays(),
      { startHour: 8, endHour: 17 },
    )

    expect(segments).toEqual([])
  })

  it('marks an event running off the displayed days as not fully visible', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-14T22:00', end: '2026-06-15T01:00' })],
      makeDays(),
      FULL_DAY,
    )

    expect(segments).toHaveLength(1)
    expect(segments[0]).toMatchObject({ dayIndex: 0, continuesBefore: true, fullyVisible: false })
  })

  it('promotes a timed event of 24h or longer instead of segmenting it', () => {
    const long = makeEvent({ id: 'long', start: '2026-06-15T09:00', end: '2026-06-16T17:00' })
    const { segments, promoted } = buildWeekSegments([long], makeDays(), FULL_DAY)

    expect(segments).toEqual([])
    expect(promoted).toEqual([long])
    expect(isPromotedToAllDay(long)).toBe(true)
  })

  it('leaves a 23h59m event in the grid', () => {
    const event = makeEvent({ start: '2026-06-15T00:00', end: '2026-06-15T23:59' })

    expect(isPromotedToAllDay(event)).toBe(false)
    expect(buildWeekSegments([event], makeDays(), FULL_DAY).segments).toHaveLength(1)
  })

  it('ignores all-day events', () => {
    const { segments, promoted } = buildWeekSegments(
      [makeEvent({ timed: false, start: '2026-06-15T00:00', end: '2026-06-15T23:59' })],
      makeDays(),
      FULL_DAY,
    )

    expect(segments).toEqual([])
    expect(promoted).toEqual([])
  })
})

describe('placeSegments', () => {
  const days = makeDays()
  const hourHeight = 56

  it('measures top from the first visible hour, not from midnight', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T09:00', end: '2026-06-15T10:00' })],
      days,
      { startHour: 8, endHour: 17 },
    )
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.COLUMNS, hourHeight, startHour: 8, endHour: 17 })

    expect(placed.get(0)?.[0]).toMatchObject({ top: 56, height: 56 })
  })

  it('scales geometry with the zoom level', () => {
    const { segments } = buildWeekSegments(
      [makeEvent({ start: '2026-06-15T01:00', end: '2026-06-15T02:00' })],
      days,
      FULL_DAY,
    )
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.COLUMNS, hourHeight: 80, ...FULL_DAY })

    expect(placed.get(0)?.[0]).toMatchObject({ top: 80, height: 80 })
  })

  it('splits overlapping events into side-by-side columns', () => {
    const { segments } = buildWeekSegments([
      makeEvent({ id: 'a', start: '2026-06-15T09:00', end: '2026-06-15T10:00' }),
      makeEvent({ id: 'b', start: '2026-06-15T09:30', end: '2026-06-15T10:30' }),
    ], days, FULL_DAY)
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.COLUMNS, hourHeight, ...FULL_DAY })!

    const day = placed.get(0)!
    expect(day.map(segment => segment.width)).toEqual(['calc(50% - 4px)', 'calc(50% - 4px)'])
    expect(day.map(segment => segment.left)).toEqual(['calc(0% + 2px)', 'calc(50% + 2px)'])
  })

  it('lets non-overlapping events share a column', () => {
    const { segments } = buildWeekSegments([
      makeEvent({ id: 'a', start: '2026-06-15T09:00', end: '2026-06-15T10:00' }),
      makeEvent({ id: 'b', start: '2026-06-15T10:00', end: '2026-06-15T11:00' }),
    ], days, FULL_DAY)
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.COLUMNS, hourHeight, ...FULL_DAY })

    expect(placed.get(0)?.every(segment => segment.width === 'calc(100% - 4px)')).toBe(true)
  })

  it('cascades overlapping events in stack mode', () => {
    const { segments } = buildWeekSegments([
      makeEvent({ id: 'a', start: '2026-06-15T09:00', end: '2026-06-15T11:00' }),
      makeEvent({ id: 'b', start: '2026-06-15T09:30', end: '2026-06-15T10:30' }),
    ], days, FULL_DAY)
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.STACK, hourHeight, ...FULL_DAY })!

    const day = placed.get(0)!
    expect(day.map(segment => segment.left)).toEqual(['0px', '14px'])
    expect(day.map(segment => segment.zIndex)).toEqual([1, 2])
  })

  it('keeps overlaps scoped to their own day', () => {
    const { segments } = buildWeekSegments([
      makeEvent({ id: 'a', start: '2026-06-15T09:00', end: '2026-06-15T10:00' }),
      makeEvent({ id: 'b', start: '2026-06-16T09:00', end: '2026-06-16T10:00' }),
    ], days, FULL_DAY)
    const placed = placeSegments(segments, { mode: EVENT_LAYOUT.COLUMNS, hourHeight, ...FULL_DAY })

    expect(placed.get(0)?.[0]?.width).toBe('calc(100% - 4px)')
    expect(placed.get(1)?.[0]?.width).toBe('calc(100% - 4px)')
  })
})

describe('buildAllDayBars', () => {
  const days = makeDays()

  it('spans an all-day event over its inclusive end date', () => {
    const { bars } = buildAllDayBars(
      [makeEvent({ timed: false, start: '2026-06-15T00:00', end: '2026-06-16T00:00' })],
      days,
    )

    expect(bars[0]).toMatchObject({ startIndex: 0, endIndex: 1, promoted: false, fullyVisible: true })
  })

  it('clamps a bar overflowing the displayed days and flags both ends', () => {
    const { bars } = buildAllDayBars(
      [makeEvent({ timed: false, start: '2026-06-10T00:00', end: '2026-06-30T00:00' })],
      days,
    )

    expect(bars[0]).toMatchObject({
      startIndex: 0,
      endIndex: 2,
      continuesBefore: true,
      continuesAfter: true,
      fullyVisible: false,
    })
  })

  it('drops events outside the displayed days', () => {
    const { bars } = buildAllDayBars(
      [makeEvent({ timed: false, start: '2026-07-01T00:00', end: '2026-07-01T00:00' })],
      days,
    )

    expect(bars).toEqual([])
  })

  it('includes promoted timed events and marks them', () => {
    const { bars } = buildAllDayBars(
      [makeEvent({ start: '2026-06-15T09:00', end: '2026-06-16T17:00' })],
      days,
    )

    expect(bars[0]).toMatchObject({ startIndex: 0, endIndex: 1, promoted: true })
  })

  it('does not open a column for a promoted event ending exactly at midnight', () => {
    const { bars } = buildAllDayBars(
      [makeEvent({ start: '2026-06-15T00:00', end: '2026-06-16T00:00' })],
      days,
    )

    expect(bars[0]).toMatchObject({ startIndex: 0, endIndex: 0, promoted: true })
  })

  it('excludes short timed events', () => {
    const { bars, laneCount } = buildAllDayBars(
      [makeEvent({ start: '2026-06-15T09:00', end: '2026-06-15T10:00' })],
      days,
    )

    expect(bars).toEqual([])
    expect(laneCount).toBe(0)
  })

  it('packs overlapping bars into separate lanes', () => {
    const { bars, laneCount } = buildAllDayBars([
      makeEvent({ id: 'a', timed: false, start: '2026-06-15T00:00', end: '2026-06-16T00:00' }),
      makeEvent({ id: 'b', timed: false, start: '2026-06-16T00:00', end: '2026-06-17T00:00' }),
    ], days)

    expect(laneCount).toBe(2)
    expect(bars.map(bar => bar.lane)).toEqual([0, 1])
  })

  it('reuses a lane for bars that do not overlap', () => {
    const { bars, laneCount } = buildAllDayBars([
      makeEvent({ id: 'a', timed: false, start: '2026-06-15T00:00', end: '2026-06-15T00:00' }),
      makeEvent({ id: 'b', timed: false, start: '2026-06-16T00:00', end: '2026-06-16T00:00' }),
    ], days)

    expect(laneCount).toBe(1)
    expect(bars.map(bar => bar.lane)).toEqual([0, 0])
  })
})

describe('countHiddenPerColumn', () => {
  it('counts only bars below the visible lanes, per column they cover', () => {
    const bars = [
      { startIndex: 0, endIndex: 2, lane: 0 },
      { startIndex: 0, endIndex: 0, lane: 3 },
      { startIndex: 1, endIndex: 2, lane: 4 },
    ] as Parameters<typeof countHiddenPerColumn>[0]

    expect(countHiddenPerColumn(bars, 3, 3)).toEqual([1, 1, 1])
  })

  it('reports nothing hidden when every lane fits', () => {
    const bars = [{ startIndex: 0, endIndex: 2, lane: 2 }] as Parameters<typeof countHiddenPerColumn>[0]

    expect(countHiddenPerColumn(bars, 3, 3)).toEqual([0, 0, 0])
  })
})
