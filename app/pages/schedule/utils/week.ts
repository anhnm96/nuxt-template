import type { ScheduleEventUI } from '~/services/schedule'
import type { DayColumn, EventLayoutMode } from '~/utils/schedule'
import dayjs from 'dayjs/esm'
import { EVENT_LAYOUT } from '~/utils/schedule'
import { assignLanes } from './index'

/**
 * Layout math for the week/day view.
 *
 * Every day is assumed to be exactly 24 hours long: minute values are counted
 * from midnight and day boundaries are a fixed 1440 minutes apart. That holds
 * in fixed-offset locales (JST); on a DST transition day the grid stays 24
 * rows tall and is an hour out after the change. Making it exact would mean
 * per-column geometry — a different pixel↔minute mapping in every column —
 * which is not worth it for the locales this app targets.
 */

export const MINUTES_PER_DAY = 24 * 60

/** Timed events at least this long are shown in the all-day row, not the grid. */
export const ALL_DAY_PROMOTION_MINUTES = MINUTES_PER_DAY

/** Layout length given to a zero-length event so it stays visible and grabbable. */
export const MIN_SEGMENT_MINUTES = 15

/** Horizontal indent applied to each successive event in stack layout. */
const STACK_OFFSET = 14

/** A timed event long enough that the grid would paint it as a full column. */
export function isPromotedToAllDay(event: Pick<ScheduleEventUI, 'timed' | 'start' | 'end'>): boolean {
  return event.timed && event.end - event.start >= ALL_DAY_PROMOTION_MINUTES * 60_000
}

/** One day's slice of a timed event. An overnight event yields one per day it covers. */
export interface WeekSegment {
  /** Unique per rendered block: an event id repeats across the days it spans. */
  key: string
  event: ScheduleEventUI
  /** Index into the displayed days. */
  dayIndex: number
  /** Minutes from that day's midnight, clamped to the visible hour range. */
  startMin: number
  endMin: number
  /** Minutes from midnight of the first displayed day — the gesture coordinate space. */
  absStart: number
  absEnd: number
  /** The event starts earlier than this segment: the top edge is a cut, not a real edge. */
  continuesBefore: boolean
  /** The event ends later than this segment. */
  continuesAfter: boolean
  /** False when any part of the event falls outside the displayed days or hour range. */
  fullyVisible: boolean
}

/** A segment with its geometry within the day column resolved. */
export interface PlacedSegment extends WeekSegment {
  top: number
  height: number
  left: string
  width: string
  zIndex: number
}

/** An all-day (or promoted) event as a horizontal bar spanning whole day columns. */
export interface AllDayBar {
  key: string
  event: ScheduleEventUI
  /** First displayed column the bar covers. */
  startIndex: number
  /** Last displayed column the bar covers, inclusive. */
  endIndex: number
  /** The event starts before the displayed range. */
  continuesBefore: boolean
  /** The event ends after the displayed range. */
  continuesAfter: boolean
  /** Row within the all-day area; overlapping bars never share one. */
  lane: number
  /** A timed event shown here because it runs 24h or longer. */
  promoted: boolean
  /** False when either end falls outside the displayed days. */
  fullyVisible: boolean
}

interface VisibleRange {
  /** First hour displayed, counted from midnight. */
  startHour: number
  /** Last hour displayed, counted from midnight. */
  endHour: number
}

/**
 * Splits timed events into per-day segments, clamped to the visible hour range.
 *
 * An event crossing midnight becomes one segment per day it touches, each
 * flagged so the view can tell a real edge from a cut one. Events running 24h
 * or longer are not segmented at all — they belong in the all-day row, and are
 * returned separately so the caller doesn't have to re-apply the rule.
 *
 * @param events - Display-ready events; all-day ones are ignored here.
 * @param days - The displayed day columns, in order.
 * @param range - The visible hour window.
 * @param range.startHour - First hour displayed, counted from midnight.
 * @param range.endHour - Last hour displayed, counted from midnight.
 * @returns `segments` for the grid, and the `promoted` events that belong in the all-day row.
 */
export function buildWeekSegments(
  events: ScheduleEventUI[],
  days: DayColumn[],
  { startHour, endHour }: VisibleRange,
): { segments: WeekSegment[], promoted: ScheduleEventUI[] } {
  const rangeStartMin = startHour * 60
  const rangeEndMin = (endHour + 1) * 60
  const segments: WeekSegment[] = []
  const promoted: ScheduleEventUI[] = []

  for (const event of events) {
    if (!event.timed) continue
    if (isPromotedToAllDay(event)) {
      promoted.push(event)
      continue
    }
    // A zero-length event still needs a grabbable body.
    const effectiveEnd = Math.max(event.end, event.start + MIN_SEGMENT_MINUTES * 60_000)
    const totalMinutes = Math.round((effectiveEnd - event.start) / 60_000)
    const start = dayjs(event.start)
    const end = dayjs(effectiveEnd)

    let visibleMinutes = 0
    const eventSegments: WeekSegment[] = []

    days.forEach((day, dayIndex) => {
      const dayStart = day.dayjs.startOf('day')
      const relStart = start.diff(dayStart, 'minute')
      const relEnd = end.diff(dayStart, 'minute')
      // Clamp into the day, then into the visible hour range.
      const startMin = Math.max(relStart, rangeStartMin)
      const endMin = Math.min(relEnd, rangeEndMin)
      if (endMin <= startMin) return

      visibleMinutes += endMin - startMin
      eventSegments.push({
        key: `${event.id}-${day.key}`,
        event,
        dayIndex,
        startMin,
        endMin,
        absStart: dayIndex * MINUTES_PER_DAY + startMin,
        absEnd: dayIndex * MINUTES_PER_DAY + endMin,
        continuesBefore: relStart < startMin,
        continuesAfter: relEnd > endMin,
        // Filled in below, once every day has been visited.
        fullyVisible: false,
      })
    })

    const fullyVisible = visibleMinutes >= totalMinutes
    for (const segment of eventSegments) segment.fullyVisible = fullyVisible
    segments.push(...eventSegments)
  }

  return { segments, promoted }
}

/** Group spans into clusters of transitively-overlapping segments. */
function toClusters(segments: WeekSegment[]): WeekSegment[][] {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const clusters: WeekSegment[][] = []
  let cluster: WeekSegment[] = []
  let clusterEnd = -1

  for (const segment of sorted) {
    if (cluster.length && segment.startMin >= clusterEnd) {
      clusters.push(cluster)
      cluster = []
      clusterEnd = -1
    }
    cluster.push(segment)
    clusterEnd = Math.max(clusterEnd, segment.endMin)
  }
  if (cluster.length) clusters.push(cluster)
  return clusters
}

interface PlaceOptions extends VisibleRange {
  mode: EventLayoutMode
  /** Pixel height of one hour row at the current zoom. */
  hourHeight: number
}

/**
 * Resolves each segment's geometry within its day column.
 *
 * - `columns`: overlapping segments are packed greedily into side-by-side columns.
 * - `stack`: overlapping segments cascade with a fixed indent, latest on top.
 *
 * @param segments - Segments from {@link buildWeekSegments}; any mix of days.
 * @param options - Layout mode, zoom, and the visible hour range `top` is measured from.
 * @param options.mode - How overlapping segments share the column.
 * @param options.hourHeight - Pixel height of one hour row at the current zoom.
 * @param options.startHour - First hour displayed; `top` is measured from it.
 * @returns Placed segments grouped by day index. Days with no segments are absent.
 */
export function placeSegments(
  segments: WeekSegment[],
  { mode, hourHeight, startHour }: PlaceOptions,
): Map<number, PlacedSegment[]> {
  const byDay = new Map<number, WeekSegment[]>()
  for (const segment of segments) {
    const bucket = byDay.get(segment.dayIndex)
    if (bucket) bucket.push(segment)
    else byDay.set(segment.dayIndex, [segment])
  }

  const rangeStartMin = startHour * 60
  const place = (
    segment: WeekSegment,
    geometry: Pick<PlacedSegment, 'left' | 'width' | 'zIndex'>,
  ): PlacedSegment => ({
    ...segment,
    top: ((segment.startMin - rangeStartMin) / 60) * hourHeight,
    height: ((segment.endMin - segment.startMin) / 60) * hourHeight,
    ...geometry,
  })

  const result = new Map<number, PlacedSegment[]>()
  for (const [dayIndex, daySegments] of byDay) {
    const placed: PlacedSegment[] = []
    for (const cluster of toClusters(daySegments)) {
      if (mode === EVENT_LAYOUT.STACK) {
        cluster.forEach((segment, index) => {
          placed.push(place(segment, {
            left: `${index * STACK_OFFSET}px`,
            width: `calc(100% - ${index * STACK_OFFSET}px - 4px)`,
            zIndex: index + 1,
          }))
        })
        continue
      }
      // columns: greedily place each segment in the first column already free.
      const cols: WeekSegment[][] = []
      for (const segment of cluster) {
        const col = cols.find(c => c[c.length - 1]!.endMin <= segment.startMin)
        if (col) col.push(segment)
        else cols.push([segment])
      }
      cols.forEach((col, colIndex) =>
        col.forEach(segment => placed.push(place(segment, {
          left: `calc(${(colIndex / cols.length) * 100}% + 2px)`,
          width: `calc(${100 / cols.length}% - 4px)`,
          zIndex: 1,
        }))),
      )
    }
    result.set(dayIndex, placed)
  }
  return result
}

/**
 * Last day column an event covers, inclusive.
 *
 * All-day events carry an inclusive end date, so their end day is the bar's
 * last day as-is. A timed event's end is exclusive, so one landing exactly on
 * midnight belongs to the previous day rather than opening a new column.
 */
function lastCoveredDay(event: ScheduleEventUI) {
  const end = dayjs(event.end)
  if (!event.timed) return end.startOf('day')
  return end.isSame(end.startOf('day')) ? end.subtract(1, 'day').startOf('day') : end.startOf('day')
}

/**
 * Builds the all-day row: true all-day events plus timed events long enough to
 * be promoted, packed into lanes so overlapping bars never share a row.
 *
 * @param events - Display-ready events; the promotion rule is applied here.
 * @param days - The displayed day columns, in order.
 * @returns The bars (each with its lane) and the number of lanes used.
 */
export function buildAllDayBars(
  events: ScheduleEventUI[],
  days: DayColumn[],
): { bars: AllDayBar[], laneCount: number } {
  const first = days[0]
  const last = days[days.length - 1]
  if (!first || !last) return { bars: [], laneCount: 0 }

  const rangeStart = first.dayjs.startOf('day')
  const lastIndex = days.length - 1

  const candidates = events.filter(event => !event.timed || isPromotedToAllDay(event))
  const spans = candidates.flatMap((event) => {
    const startDay = dayjs(event.start).startOf('day')
    const endDay = lastCoveredDay(event)
    const rawStart = startDay.diff(rangeStart, 'day')
    const rawEnd = Math.max(endDay.diff(rangeStart, 'day'), rawStart)
    // Entirely outside the displayed days.
    if (rawEnd < 0 || rawStart > lastIndex) return []
    const startIndex = Math.max(rawStart, 0)
    const endIndex = Math.min(rawEnd, lastIndex)
    return [{
      key: `${event.id}-allday`,
      event,
      startIndex,
      endIndex,
      continuesBefore: rawStart < 0,
      continuesAfter: rawEnd > lastIndex,
      promoted: event.timed,
      fullyVisible: rawStart >= 0 && rawEnd <= lastIndex,
      // assignLanes packs on a numeric range; day indices are that range here,
      // with the end made exclusive so touching bars can share a lane.
      startMin: startIndex,
      endMin: endIndex + 1,
    }]
  })

  const { items, laneCount } = assignLanes(spans)
  const bars = items.map(({ startMin: _startMin, endMin: _endMin, ...bar }) => bar)
  return { bars, laneCount: spans.length ? laneCount : 0 }
}

/**
 * Number of bars hidden per day column once the all-day row is capped.
 *
 * @param bars - Lane-assigned bars from {@link buildAllDayBars}.
 * @param visibleLanes - How many lanes the collapsed row shows.
 * @param dayCount - Number of displayed columns.
 * @returns One count per column; `0` where nothing is hidden.
 */
export function countHiddenPerColumn(bars: AllDayBar[], visibleLanes: number, dayCount: number): number[] {
  // The type argument matters: without it `Array.from({ length })` yields
  // `unknown[]`, and `fill` does not narrow it back.
  const counts = Array.from<number>({ length: dayCount }).fill(0)
  for (const bar of bars) {
    if (bar.lane < visibleLanes) continue
    for (let index = bar.startIndex; index <= bar.endIndex; index++) {
      counts[index] = (counts[index] ?? 0) + 1
    }
  }
  return counts
}
