import type { Dayjs } from 'dayjs/esm'
import type { ScheduleEvent } from '~/services/schedule'
import dayjs from 'dayjs/esm'

/** Pixel height of one hour row — keep in sync with the `h-14` cell class (56px). */
export const HOUR_HEIGHT = 56

/** Horizontal indent applied to each successive event in stack layout. */
const STACK_OFFSET = 14

export const EVENT_LAYOUT = {
  /** Overlapping events split the column width side by side. */
  COLUMNS: 'columns',
  /** Overlapping events cascade on top of each other with a small indent. */
  STACK: 'stack',
} as const
export type EventLayoutMode = ValueOf<typeof EVENT_LAYOUT>

export interface DayColumn {
  key: string
  label: string
  date: string
  dayjs: Dayjs
  isToday: boolean
}

export interface PositionedEvent {
  event: ScheduleEvent
  /** Offset from the top of the day column, in pixels. */
  top: number
  height: number
  /** CSS-ready geometry for the block within its day column. */
  left: string
  width: string
  zIndex: number
  color: string
  timeLabel: string
}

interface EventSpan {
  ev: ScheduleEvent
  startMin: number
  endMin: number
  timeLabel: string
}

/** Resolve an event's display color (per-event override wins over its calendar). */
export function eventColor(ev: ScheduleEvent) {
  const hex = ev.scheduleColor || ev.calendarColor
  return hex.startsWith('#') ? hex : `#${hex}`
}

/** Turn a single day's events into time spans (minutes from midnight). */
function toSpans(events: ScheduleEvent[], dayKey: string): EventSpan[] {
  return events.flatMap((ev) => {
    const s = dayjs(ev.startDateString)
    if (s.format('YYYY-MM-DD') !== dayKey) return []
    const e = dayjs(ev.endDateString)
    const startMin = s.hour() * 60 + s.minute()
    // clamp events that cross midnight to the end of the day
    const rawEnd = e.format('YYYY-MM-DD') === dayKey ? e.hour() * 60 + e.minute() : 24 * 60
    const endMin = Math.max(rawEnd, startMin + 30)
    return [{ ev, startMin, endMin, timeLabel: s.format('HH:mm') }]
  })
}

/** Group spans into clusters of transitively-overlapping events. */
function toClusters(spans: EventSpan[]): EventSpan[][] {
  const sorted = [...spans].sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  const clusters: EventSpan[][] = []
  let cluster: EventSpan[] = []
  let clusterEnd = -1

  for (const span of sorted) {
    if (cluster.length && span.startMin >= clusterEnd) {
      clusters.push(cluster)
      cluster = []
      clusterEnd = -1
    }
    cluster.push(span)
    clusterEnd = Math.max(clusterEnd, span.endMin)
  }
  if (cluster.length) clusters.push(cluster)
  return clusters
}

function position(span: EventSpan, geo: Pick<PositionedEvent, 'left' | 'width' | 'zIndex'>): PositionedEvent {
  return {
    event: span.ev,
    top: (span.startMin / 60) * HOUR_HEIGHT,
    height: ((span.endMin - span.startMin) / 60) * HOUR_HEIGHT,
    color: eventColor(span.ev),
    timeLabel: span.timeLabel,
    ...geo,
  }
}

/**
 * Lay out one day's timed events.
 * - `columns`: overlapping events are packed greedily into side-by-side columns.
 * - `stack`: overlapping events cascade with a fixed indent, latest on top.
 */
export function layoutDayEvents(events: ScheduleEvent[], dayKey: string, mode: EventLayoutMode): PositionedEvent[] {
  const result: PositionedEvent[] = []

  for (const cluster of toClusters(toSpans(events, dayKey))) {
    if (mode === EVENT_LAYOUT.STACK) {
      cluster.forEach((span, i) => {
        result.push(position(span, {
          left: `${i * STACK_OFFSET}px`,
          width: `calc(100% - ${i * STACK_OFFSET}px - 4px)`,
          zIndex: i + 1,
        }))
      })
      continue
    }

    // columns: greedily place each span in the first column whose last event ended
    const cols: EventSpan[][] = []
    for (const span of cluster) {
      const col = cols.find(c => c[c.length - 1]!.endMin <= span.startMin)
      if (col) col.push(span)
      else cols.push([span])
    }
    cols.forEach((col, colIndex) =>
      col.forEach(span => result.push(position(span, {
        left: `calc(${(colIndex / cols.length) * 100}% + 2px)`,
        width: `calc(${100 / cols.length}% - 4px)`,
        zIndex: 1,
      }))),
    )
  }

  return result
}
