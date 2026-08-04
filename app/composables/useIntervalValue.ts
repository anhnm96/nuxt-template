/**
 * Reactively holds the result of `compute`, re-evaluating it on a fixed interval.
 *
 * The value is first evaluated on mount, then refreshed every `interval` ms.
 * The timer runs on the client only (started in `onMounted`) and is cleared
 * automatically when the owning scope is disposed.
 *
 * @typeParam T - Type of the computed value.
 * @param compute - Callback that produces the current value; called on mount and on every tick.
 * @param interval - Refresh interval in milliseconds. Defaults to `1000`.
 * @param initial - Value held before the first evaluation (i.e. during SSR and before mount).
 *   Pass it explicitly to avoid an SSR/hydration mismatch. When omitted, `compute()` is called
 *   eagerly during setup, which also runs on the server.
 * @returns A ref that updates every `interval` ms with the latest `compute()` result.
 *
 * @example
 * ```ts
 * // Minute-of-day, refreshed every minute, SSR-safe via an explicit initial.
 * const nowMinutes = useIntervalValue(() => {
 *   const now = new Date()
 *   return now.getHours() * 60 + now.getMinutes()
 * }, 60_000, 0)
 * ```
 */
export function useIntervalValue<T>(compute: () => T, interval = 1000, initial: T = compute()): Ref<T> {
  const value = ref(initial) as Ref<T>

  function update() {
    value.value = compute()
  }

  let timer: ReturnType<typeof setInterval> | undefined

  onMounted(() => {
    update()
    timer = setInterval(update, interval)
  })

  onScopeDispose(() => {
    if (timer) clearInterval(timer)
  })

  return value
}
