# useIntervalValue

A ref that holds the result of a function and refreshes it on a fixed interval. Use it for a value that changes with time, such as "now", where the component must redraw without a user action.

Used by the schedule timeline and week view to place the "now" line.

## Usage

```ts
// The current time in milliseconds, refreshed every minute.
// 0 stands for "not mounted yet", so the "now" line stays hidden until mount.
const nowTimestamp = useIntervalValue(() => Date.now(), 60_000, 0)

const now = computed(() => {
  return nowTimestamp.value === 0 ? '' : dayjs(nowTimestamp.value).format('HH:mm')
})
```

## Signature

```ts
function useIntervalValue<T>(
  compute: () => T,
  interval = 1000,
  initial: T = compute(),
): Ref<T>
```

| Parameter | Type | Default | What it does |
| --- | --- | --- | --- |
| `compute` | `() => T` | required | Produces the current value. It runs on mount and on every tick. |
| `interval` | `number` | `1000` | Milliseconds between refreshes. |
| `initial` | `T` | `compute()` | The value held before mount, which includes server rendering. |

## Behaviour

- The ref starts as `initial`.
- On mount, `compute` runs once and the ref takes its result. A timer then runs `compute` every `interval` milliseconds.
- The timer starts in `onMounted`, so it runs in the browser only.
- The timer is cleared when the owning scope is disposed. Nothing needs cleaning up by hand.

## Notes

- **Pass `initial` for anything that depends on the clock.** When it is omitted, the default `compute()` runs during setup, and that also runs on the server. The server and the browser then compute different values, and hydration reports a mismatch. An explicit `initial` such as `0` renders the same on both sides.
- **Ticks do not follow the wall clock.** The interval starts at mount. With `60_000`, the first refresh after mount comes about 60 seconds later, not at the next minute boundary, so a "current minute" can be out of date by up to a minute.
- **It runs while the tab is hidden.** The timer is not paused for a background tab.
- **The interval is a plain number, read once.** The timer is created on mount, so there is no way to change the period afterwards.
- **Call it from `setup`.** It registers `onMounted` and `onScopeDispose`, which need a running component or effect scope.
- The returned ref is an ordinary ref. A value you assign to it is replaced at the next tick.
