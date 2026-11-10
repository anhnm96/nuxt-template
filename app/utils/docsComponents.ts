// Maps a component folder under `app/components` to its Demo. The default is the folder name:
// `select` has the Playground page `/playground/select`. Only the exceptions live here.

/** Folder whose Playground page has another name. */
export const PLAYGROUND_OVERRIDES: Record<string, string> = {
  'progress': 'progress-bar',
  // The Menu page also demos ContextMenu and Dropdown.
  'context-menu': 'menu',
  'dropdown': 'menu',
}

/** Folders with a README but no Playground page. */
export const NO_DEMO: readonly string[] = ['date-picker', 'popover']

/** Playground page name for a component folder, without checking that the page exists. */
export function playgroundFor(folder: string): string | undefined {
  if (NO_DEMO.includes(folder)) return undefined
  return PLAYGROUND_OVERRIDES[folder] ?? folder
}
