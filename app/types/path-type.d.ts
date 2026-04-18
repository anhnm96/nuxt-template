// https://x.com/KaraBharat/status/2044628239205962143/photo/1

type Path<T> = T extends object ? {
  [K in keyof T]: K extends string ? `${K}` | `${K}.${Path<T[K]>}` : never
}[keyof T] : never

type PathType<T, P extends Path<T>> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? Rest extends Path<T[Key]>
      ? PathType<T[Key], Rest>
      : never
    : never
  : P extends keyof T
    ? T[P]
    : never

// interface AppState {
//   user: {
//     id: string
//     preferences: {
//       theme: 'light' | 'dark'
//       language: 'en' | 'fr'
//     }
//   }
//   ui: {
//     sidebarOpen: boolean
//   }
// }

// type ThemeType = PathType<AppState, 'user.preferences.theme'> // 'light' | 'dark'
// type SidebarType = PathType<AppState, 'ui.sidebarOpen'> // boolean
