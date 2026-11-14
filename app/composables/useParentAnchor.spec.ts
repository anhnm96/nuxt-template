import type { AnchorTarget } from './useParentAnchor'
import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import { useParentAnchor } from './useParentAnchor'

/**
 * `Tooltip` and `ContextMenu` share this resolver. Their own specs each cover the default
 * `target` only, so the three forms are covered here.
 */

let anchor: Ref<HTMLElement | null>

/** Renders no element of its own, as the real hosts do. */
const Probe = defineComponent({
  props: { target: { type: [Boolean, String, Object] as PropType<AnchorTarget>, default: true } },
  setup(props) {
    anchor = useParentAnchor(() => props.target, 'Probe')
    return () => null
  },
})

function mountProbe(target?: AnchorTarget) {
  const state = reactive<{ target?: AnchorTarget }>(target === undefined ? {} : { target })
  const wrapper = mount(defineComponent({
    render: () => h('section', { id: 'parent' }, ['text', h(Probe, state)]),
  }), { attachTo: document.body })
  return { wrapper, state }
}

afterEach(() => {
  document.body.innerHTML = ''
})

describe('useParentAnchor', () => {
  it('resolves `true` to the element the component was written inside', () => {
    const { wrapper } = mountProbe()
    expect(anchor.value).toBe(document.getElementById('parent'))
    wrapper.unmount()
  })

  it('resolves a selector', () => {
    const other = document.createElement('div')
    other.className = 'elsewhere'
    document.body.appendChild(other)
    const { wrapper } = mountProbe('.elsewhere')
    expect(anchor.value).toBe(other)
    wrapper.unmount()
  })

  it('resolves an element to itself', () => {
    const other = document.createElement('div')
    const { wrapper } = mountProbe(other)
    expect(anchor.value).toBe(other)
    wrapper.unmount()
  })

  it('resolves a selector that matches nothing to null and names the component', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { wrapper } = mountProbe('.missing')
    expect(anchor.value).toBeNull()
    expect(error).toHaveBeenCalledWith('[Probe] target ".missing" not found')
    wrapper.unmount()
  })

  it('resolves again when the target changes', async () => {
    const other = document.createElement('div')
    other.className = 'elsewhere'
    document.body.appendChild(other)
    const { wrapper, state } = mountProbe()
    state.target = '.elsewhere'
    await nextTick()
    expect(anchor.value).toBe(other)
    wrapper.unmount()
  })
})
