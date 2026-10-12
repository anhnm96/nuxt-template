import { mount } from '@vue/test-utils'
import { defineComponent, h } from 'vue'
import AutocompletePopup from './AutocompletePopup.vue'
import { provideAutocompleteContext } from './context'
import { useAutocomplete } from './useAutocomplete'

/**
 * The popup draws against a frozen view once the Autocomplete closes.
 *
 * Driven here through a harness rather than through `Autocomplete`, because the real artifact
 * only appears while `Dropdown` plays its leave transition — and happy-dom runs no transitions,
 * so the popover unmounts immediately and the window this guards never opens in a unit mount.
 */

interface Game { gameId: string, gameName: string }

const games: Game[] = [
  { gameId: 'g1', gameName: 'Alpha Strike' },
  { gameId: 'g2', gameName: 'Battle Chasm' },
  { gameId: 'g4', gameName: 'Dune Racer' },
]

function mountPopup() {
  const isOpen = ref(true)
  const query = ref('')
  const model = ref<string | null>(null)

  const Harness = defineComponent({
    setup() {
      const autocomplete = useAutocomplete<Game>({
        items: () => games,
        itemLabel: 'gameName',
        itemValue: 'gameId',
        id: 'h',
        isOpen,
        query,
        selectedValue: () => model.value,
        onValueChange: value => (model.value = value as string | null),
      })
      provideAutocompleteContext({
        autocomplete,
        listboxId: computed(() => 'h-listbox'),
        isOpen,
        labelledBy: computed(() => 'h'),
        emptyText: computed(() => 'No results'),
        minQueryText: computed(() => 'Type more'),
        onOptionSelect: option => autocomplete.commit(option),
      })
      return () => h(AutocompletePopup)
    },
  })

  return { wrapper: mount(Harness), isOpen, query, model }
}

function optionLabels(wrapper: ReturnType<typeof mountPopup>['wrapper']) {
  return wrapper.findAll('[role="option"]').map(o => o.text())
}

describe('autocompletePopup — the view freezes while closing', () => {
  it('draws live state while open', async () => {
    const { wrapper, query } = mountPopup()
    expect(optionLabels(wrapper)).toHaveLength(games.length)
    query.value = 'zzz'
    await nextTick()
    expect(wrapper.text()).toContain('No results')
  })

  it('ignores a model change made after it closed', async () => {
    const { wrapper, query, isOpen, model } = mountPopup()
    query.value = 'zzz'
    await nextTick()
    expect(wrapper.text()).toContain('No results')

    // Exactly what Abandon does: close, then restore the Last Commit. The restored Value makes
    // the Query an echo again, which would otherwise unfilter the list on the way out.
    isOpen.value = false
    model.value = 'g1'
    query.value = 'Alpha Strike'
    await nextTick()

    expect(wrapper.text()).toContain('No results')
    expect(optionLabels(wrapper)).toHaveLength(0)
  })

  it('tracks again once it reopens', async () => {
    const { wrapper, query, isOpen, model } = mountPopup()
    query.value = 'zzz'
    await nextTick()
    isOpen.value = false
    model.value = 'g1'
    query.value = 'Alpha Strike'
    await nextTick()

    // Reopening alone must refresh it — the view itself has not changed since the freeze.
    isOpen.value = true
    await nextTick()
    expect(wrapper.text()).not.toContain('No results')
    expect(optionLabels(wrapper)).toHaveLength(games.length)
  })
})
