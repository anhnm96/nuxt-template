import type { ObjectDirective } from 'vue'
import clickOutsidePlugin from './clickOutside'

/**
 * The directive is registered inside the plugin, so pull it back out with a fake app
 * rather than exporting it just for the test.
 */
function getDirective(): ObjectDirective {
  const registered: Record<string, ObjectDirective> = {}
  const nuxtApp = {
    vueApp: {
      directive: (name: string, def: ObjectDirective) => {
        registered[name] = def
      },
    },
  }
  ;(clickOutsidePlugin as any)(nuxtApp)
  return registered.clickOutside!
}

function binding(value = () => {}) {
  return { value, modifiers: {}, arg: undefined } as any
}

describe('v-click-outside', () => {
  let frames: (FrameRequestCallback | null)[]

  beforeEach(() => {
    frames = []
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => frames.push(cb))
    vi.stubGlobal('cancelAnimationFrame', (id: number) => {
      frames[id - 1] = null
    })
  })

  afterEach(() => vi.unstubAllGlobals())

  /** Runs whatever frames are still pending, as the browser would on the next paint. */
  function flushFrames() {
    for (const frame of frames) frame?.(0)
  }

  it('attaches the listener a frame after mount, not during it', () => {
    const directive = getDirective()
    const add = vi.spyOn(document.body, 'addEventListener')
    const el = document.createElement('div')

    directive.mounted!(el, binding(), null as any, null as any)
    expect(add).not.toHaveBeenCalled()

    flushFrames()
    expect(add).toHaveBeenCalledOnce()
  })

  it('leaks nothing when the element unmounts inside that frame', () => {
    /**
     * The deferral and the teardown used to race. `beforeUnmount` removed a listener that
     * was not attached yet, then the frame attached one with nothing left to remove it —
     * so every open/close inside a single frame left a handler on `document.body`, holding
     * its element and its binding alive and firing on every click for the rest of the page.
     */
    const directive = getDirective()
    const add = vi.spyOn(document.body, 'addEventListener')
    const el = document.createElement('div')

    directive.mounted!(el, binding(), null as any, null as any)
    directive.beforeUnmount!(el, binding(), null as any, null as any)
    flushFrames()

    expect(add).not.toHaveBeenCalled()
  })

  it('still removes the listener when the element lives past the frame', () => {
    const directive = getDirective()
    const remove = vi.spyOn(document.body, 'removeEventListener')
    const el = document.createElement('div')

    directive.mounted!(el, binding(), null as any, null as any)
    flushFrames()
    directive.beforeUnmount!(el, binding(), null as any, null as any)

    expect(remove).toHaveBeenCalledOnce()
  })
})
