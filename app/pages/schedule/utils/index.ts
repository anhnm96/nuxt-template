import type { Dayjs } from 'dayjs/esm'
import dayjs from 'dayjs/esm'

/**
 * Clamps an event to the minute range displayed on the timeline.
 *
 * Minutes are counted from midnight of `rangeStart`, so the range can span
 * several days (a week) as well as a single one. Events starting before or
 * ending after the range are pulled in to its bounds, so a longer event
 * renders as the slice that falls inside the displayed window.
 *
 * @param event - The event's start/end timestamps (ms).
 * @param event.start - Start timestamp (ms).
 * @param event.end - End timestamp (ms).
 * @param rangeStart - First day shown on the timeline; minutes are measured from its midnight.
 * @param startHour - First hour shown, counted from `rangeStart` midnight.
 * @param endHour - Last hour shown, counted from `rangeStart` midnight.
 * @returns Start and end as minutes from `rangeStart` midnight, clamped to the
 *   displayed range, with `endMin` never before `startMin`.
 */
export function clampEventToRangeMinutes(
  event: { start: number, end: number },
  rangeStart: Dayjs,
  startHour: number,
  endHour: number,
): { startMin: number, endMin: number } {
  const base = rangeStart.startOf('day')
  const rangeStartMin = startHour * 60
  const rangeEndMin = (endHour + 1) * 60
  const startMin = clamp(dayjs(event.start).diff(base, 'minute'), rangeStartMin, rangeEndMin)
  const endMin = clamp(dayjs(event.end).diff(base, 'minute'), startMin, rangeEndMin)
  return { startMin, endMin }
}

/**
 * Packs time ranges into lanes (horizontal bands) so overlapping items never
 * share one.
 *
 * First-fit in start order, which yields the minimum number of lanes: each
 * item takes the lowest lane already free at its start time, or opens a new
 * one. Pure and DOM-free, so it's straightforward to unit test.
 *
 * @typeParam T - Any object carrying `startMin`/`endMin`; other fields pass through untouched.
 * @param items - The ranges to pack. Not mutated; the result holds copies.
 * @returns The items sorted by start time, each with its assigned `lane`
 *   (0-based), plus `laneCount` — the number of lanes used, at least 1 even
 *   when `items` is empty.
 */
export function assignLanes<T extends { startMin: number, endMin: number }>(
  items: T[],
): { items: (T & { lane: number })[], laneCount: number } {
  const laidOut = items
    .map(item => ({ ...item, lane: 0 }))
    .sort((a, b) => a.startMin - b.startMin || a.endMin - b.endMin)
  // End minute of the last item placed in each lane.
  const laneEnds: number[] = []
  for (const item of laidOut) {
    // Find a lane that's free before this item's start (open one if none).
    let lane = laneEnds.findIndex(end => end <= item.startMin)
    if (lane === -1) {
      lane = laneEnds.length
      laneEnds.push(item.endMin)
    } else {
      laneEnds[lane] = item.endMin
    }
    item.lane = lane
  }
  return { items: laidOut, laneCount: Math.max(laneEnds.length, 1) }
}

/**
 * Edge chip for an event that has scrolled off-screen.
 *
 * Besides `side` and `target` (the scrollLeft to reveal it), it carries the
 * nearest event's `item` on that side (used for tooltip/label display).
 * Horizontal position is left to the caller's `position: sticky`, so no
 * coordinate is stored here.
 *
 * @typeParam T - Type of the payload attached to the nearest event.
 */
export interface OffscreenChip<T = unknown> {
  side: 'start' | 'end'
  target: number
  item: T
}

/**
 * Computes edge chips for events sitting outside the visible window, from
 * each event's pixel range (px from the timeline start).
 *
 * @typeParam T - Type of the payload carried on each range and returned on its chip.
 * @param ranges - Each event's pixel range (`start`/`end`, px from the timeline start) plus its payload `item`.
 * @param visStart - Left edge of the visible timeline window, in the same px coordinate space as `ranges`.
 * @param visW - Width of the visible timeline window (excluding any frozen columns).
 * @param revealPad - How many px of the revealed edge to keep inside the visible window after scrolling. Defaults to `24`.
 * @returns An empty array if any event overlaps the visible window. Otherwise, a chip for the nearest event on
 *   each side that has one off-screen — both `start` and `end` if events are off-screen on both sides.
 *   `target` is the scrollLeft that reveals that edge `revealPad` px into the visible window when clicked.
 */
export function computeOffscreenChips<T>(
  ranges: { start: number, end: number, item: T }[],
  visStart: number,
  visW: number,
  revealPad = 24,
): OffscreenChip<T>[] {
  if (!ranges.length || visW <= 0) return []
  const visEnd = visStart + visW
  // Nearest fully-left / fully-right event relative to the visible window.
  let nearestLeftER = -Infinity
  let nearestRightEL = Infinity
  let nearestLeft: { start: number, item: T } | null = null
  let nearestRight: { end: number, item: T } | null = null
  for (const { start: eL, end: eR, item } of ranges) {
    // Any event overlapping the visible window means no chip is needed.
    if (eR > visStart && eL < visEnd) return []
    if (eR <= visStart) {
      if (eR > nearestLeftER) {
        nearestLeftER = eR
        nearestLeft = { start: eL, item }
      }
    } else if (eL < nearestRightEL) {
      nearestRightEL = eL
      nearestRight = { end: eR, item }
    }
  }
  const chips: OffscreenChip<T>[] = []
  if (nearestLeft)
    chips.push({ side: 'start', target: Math.max(nearestLeft.start - revealPad, 0), item: nearestLeft.item })
  if (nearestRight)
    chips.push({ side: 'end', target: Math.max(nearestRight.end - visW + revealPad, 0), item: nearestRight.item })
  return chips
}
