/** what kind of work a card is, rendered as its badge */
export type TaskType = 'feature' | 'bug' | 'chore'

export const taskTypes: Record<TaskType, { label: string, class: string }> = {
  feature: { label: 'Feature Request', class: 'bg-teal-100 text-teal-900' },
  bug: { label: 'Bug', class: 'bg-red-100 text-red-900' },
  chore: { label: 'Chore', class: 'bg-amber-100 text-amber-900' },
}

/** one card of the board */
export interface Task {
  /**
   * unique across the whole board, not just its column: a card moving to
   * another column must not collide with the v-for key of one already there
   */
  id: string
  title: string
  type: TaskType
  date: string
  name: string
  avatar: string
}

/** one column, owning its own cards */
export interface Column {
  name: string
  tasks: Task[]
}

const cards: Omit<Task, 'avatar'>[] = [
  {
    id: 'task-1',
    title: 'Minim laboris occaecat sint cillum ex tempor.',
    type: 'feature',
    date: 'Mar 17 2020',
    name: 'Donaldson Leonard',
  },
  {
    id: 'task-2',
    title: 'Magna id aliquip dolor occaecat culpa consectetur et in cupidatat.',
    type: 'bug',
    date: 'Jun 15 2020',
    name: 'Wendy Sloan',
  },
  {
    id: 'task-3',
    title: 'Dolore elit sunt dolore commodo quis velit pariatur id veniam sit.',
    type: 'chore',
    date: 'Jul 21 2020',
    name: 'Doreen Arnold',
  },
  {
    id: 'task-4',
    title: 'Labore culpa laborum reprehenderit sunt aute sunt amet ipsum.',
    type: 'feature',
    date: 'Jun 08 2020',
    name: 'Hartman Sheppard',
  },
  {
    id: 'task-5',
    title: 'Consectetur ut tempor id quis et sunt est et cupidatat minim Lorem.',
    type: 'bug',
    date: 'Jul 22 2020',
    name: 'Pearson Love',
  },
  {
    id: 'task-6',
    title: 'Laborum Lorem tempor voluptate officia cillum sit eu.',
    type: 'chore',
    date: 'May 24 2020',
    name: 'Aisha Christensen',
  },
]

/**
 * A fresh board. `Done` starts empty on purpose, an empty list is its own drop
 * case: there is no item to enter, the list itself takes the drag over.
 */
export function createBoard(): Column[] {
  const withAvatar = (task: Omit<Task, 'avatar'>): Task => ({
    ...task,
    avatar: `https://robohash.org/${encodeURIComponent(task.name)}/100?format=png`,
  })
  return [
    { name: 'Backlog', tasks: cards.slice(0, 3).map(withAvatar) },
    { name: 'In Progress', tasks: cards.slice(3, 5).map(withAvatar) },
    { name: 'Ready for Review', tasks: cards.slice(5).map(withAvatar) },
    { name: 'Done', tasks: [] },
  ]
}
