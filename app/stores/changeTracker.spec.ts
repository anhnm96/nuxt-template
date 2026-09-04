import { changeTracker, comparators } from './changeTracker'

describe('changeTracker', () => {
  it('should detect changed properties', () => {
    const obj: Record<string, any> = { a: 'a' }
    changeTracker.track(obj)
    obj.a = 'a'
    obj.b = 'c'
    obj.c = 'd'
    expect(changeTracker.changedProps(obj)).toMatchObject(['b', 'c'])
  })

  it('should produce changed partial object', () => {
    const obj: Record<string, any> = { a: 'a' }
    changeTracker.track(obj)
    obj.a = 'a'
    obj.b = 'c'
    obj.c = 'd'
    expect(changeTracker.changed(obj)).toMatchObject({ b: 'c', c: 'd' })
  })

  it('should throw error on untracked object', () => {
    const obj = {}
    expect(() => changeTracker.changed(obj)).toThrowError()
  })

  describe('comparators.unorderedArray', () => {
    const compare = comparators.unorderedArray

    it('should treat a reordered array as unchanged', () => {
      const obj: Record<string, any> = { tags: [1, 2, 3], name: 'a' }
      changeTracker.track(obj)
      obj.tags = [1, 3, 2]

      expect(changeTracker.changedProps(obj)).toMatchObject(['tags'])
      expect(changeTracker.changedProps(obj, { compare })).toMatchObject([])
    })

    it('should ignore order for arrays of objects', () => {
      const obj: Record<string, any> = { rows: [{ id: 1 }, { id: 2 }] }
      changeTracker.track(obj)
      obj.rows = [{ id: 2 }, { id: 1 }]

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject([])
    })

    it('should still detect real changes', () => {
      const obj: Record<string, any> = { tags: [1, 2, 3] }
      changeTracker.track(obj)
      obj.tags = [1, 2, 4]

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['tags'])
    })

    it('should not collapse duplicates', () => {
      const obj: Record<string, any> = { tags: [1, 1, 2] }
      changeTracker.track(obj)
      obj.tags = [1, 2, 2]

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['tags'])
    })

    it('should fall through to deep equality for non-array props', () => {
      const obj: Record<string, any> = { tags: [1, 2], name: 'a' }
      changeTracker.track(obj)
      obj.name = 'b'

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['name'])
    })
  })

  describe('comparators.empty', () => {
    const compare = comparators.empty

    it.each([
      ['', null],
      [null, undefined],
      [undefined, ''],
    ])('should treat %o and %o as the same empty value', (current, original) => {
      const obj: Record<string, any> = { note: original }
      changeTracker.track(obj)
      obj.note = current

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject([])
    })

    it('should not suppress a real value change', () => {
      const obj: Record<string, any> = { note: '' }
      changeTracker.track(obj)
      obj.note = 'hello'

      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['note'])
    })
  })

  describe('comparators.byProp', () => {
    it('should apply a comparator only to the named props', () => {
      const obj: Record<string, any> = { tags: [1, 2], others: [1, 2] }
      changeTracker.track(obj)
      obj.tags = [2, 1]
      obj.others = [2, 1]

      const compare = comparators.byProp({ tags: comparators.unorderedArray })
      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['others'])
    })
  })

  describe('comparators.merge', () => {
    it('should use the first comparator that returns a verdict', () => {
      const obj: Record<string, any> = { note: null, tags: [1, 2], name: 'a' }
      changeTracker.track(obj)
      obj.note = ''
      obj.tags = [2, 1]
      obj.name = 'b'

      const compare = comparators.merge(
        comparators.empty,
        comparators.byProp({ tags: comparators.unorderedArray }),
      )
      expect(changeTracker.changedProps(obj, { compare })).toMatchObject(['name'])
    })
  })

  it('should forward compare options through changed()', () => {
    const obj: Record<string, any> = { tags: [1, 2, 3], name: 'a' }
    changeTracker.track(obj)
    obj.tags = [3, 2, 1]
    obj.name = 'b'

    expect(changeTracker.changed(obj, { compare: comparators.unorderedArray }))
      .toMatchObject({ name: 'b' })
  })
})
