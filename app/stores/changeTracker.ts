import { cloneDeep, isEqual, pick } from 'lodash-es'

/**
 * Decides whether a prop counts as unchanged. Return `true`/`false` to settle
 * it, or `undefined` to fall back to deep equality -- the same contract as
 * lodash's `isEqualWith` customizer, so a comparator only has to handle the
 * cases it actually cares about.
 */
export type ChangeCompareFn = (
  currentValue: any,
  originalValue: any,
  prop: string,
) => boolean | undefined

export interface ChangeCompareOptions {
  /** See {@link comparators} for ready-made comparators. */
  compare?: ChangeCompareFn
}

/**
 * Ready-made comparators for `changedProps`/`changed`.
 *
 * ```ts
 * // one rule for every prop
 * changeTracker.changedProps(form, { compare: comparators.unorderedArray })
 *
 * // scoped to specific props
 * changeTracker.changedProps(form, {
 *   compare: comparators.byProp({ countries: comparators.unorderedArray }),
 * })
 *
 * // combined -- first comparator with a verdict wins
 * changeTracker.changedProps(form, {
 *   compare: comparators.merge(
 *     comparators.empty,
 *     comparators.byProp({ countries: comparators.unorderedArray }),
 *   ),
 * })
 * ```
 */
export const comparators = {
  /**
   * Compares arrays as multisets: order is ignored, but duplicates still count,
   * so `[1, 1, 2]` and `[1, 2, 2]` stay different. Values that aren't both
   * arrays fall through to deep equality, so this is safe to apply to any prop.
   */
  unorderedArray(currentValue: any, originalValue: any): boolean | undefined {
    if (!Array.isArray(currentValue) || !Array.isArray(originalValue)) return undefined
    if (currentValue.length !== originalValue.length) return false

    // Deep-equal match consumed one at a time, so duplicates aren't collapsed
    const remaining = [...originalValue]
    return currentValue.every((item) => {
      const index = remaining.findIndex(other => isEqual(item, other))
      if (index === -1) return false

      remaining.splice(index, 1)
      return true
    })
  },

  /**
   * Treats `null`, `undefined` and `''` as the same empty value -- the usual
   * culprit behind a cleared input reading as changed. Only ever suppresses a
   * false positive: anything else falls through to deep equality.
   */
  empty(currentValue: any, originalValue: any): boolean | undefined {
    const isEmpty = (value: unknown) => value === null || value === undefined || value === ''

    return isEmpty(currentValue) && isEmpty(originalValue) ? true : undefined
  },

  /** Applies a comparator only to the named props; the rest fall through. */
  byProp(map: Record<string, ChangeCompareFn>): ChangeCompareFn {
    return (currentValue, originalValue, prop) => map[prop]?.(currentValue, originalValue, prop)
  },

  /** Chains comparators, using the first one that returns a verdict. */
  merge(...fns: ChangeCompareFn[]): ChangeCompareFn {
    return (currentValue, originalValue, prop) => {
      for (const fn of fns) {
        const verdict = fn(currentValue, originalValue, prop)
        if (verdict !== undefined) return verdict
      }

      return undefined
    }
  },
}

class ChangeTracker {
  _store: WeakMap<Record<string, any>, Record<string, any>>

  constructor() {
    this._store = new WeakMap()
  }

  track(object: Record<string, any>) {
    // Clone the object
    const clone = cloneDeep(object)
    // Store it
    this._store.set(object, clone)
  }

  getOriginal(object: Record<string, any>): Record<string, any> {
    // Access everything so if this function is used inside a
    // computed property, Vue will refresh the computed value
    // when object changes
    for (const prop in object) {
      const __ = object[prop]
    }
    return this._store.get(object)!
  }

  changedProps(object: Record<string, any>, options: ChangeCompareOptions = {}): Array<string> {
    const clone = this.getOriginal(object)
    if (clone === undefined) {
      throw new Error(
        'This object was not tracked. Call changeTracker.track(object) first.',
      )
    }
    const props = []
    for (const prop in object) {
      // `??` so a comparator returning `false` still wins over the default
      const isPropEqual = options.compare?.(object[prop], clone[prop], prop)
        ?? isEqual(object[prop], clone[prop])

      if (!isPropEqual) {
        props.push(prop)
      }
    }
    return props
  }

  changed(object: Record<string, any>, options: ChangeCompareOptions = {}): object {
    return pick(object, this.changedProps(object, options))
  }

  /**
   * Mark a property as unchanged by copying value back to original object
   */
  setUnchanged(object: Record<string, any>, prop: string): void {
    const original = this.getOriginal(object)
    original[prop] = object[prop]
  }
}

export const changeTracker = new ChangeTracker()
