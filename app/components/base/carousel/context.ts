interface CarouselContext {
  addItem: (item: HTMLElement) => void
  removeItem: (item: HTMLElement) => void
}

export const [provideCarouselContext, injectCarouselContext]
  = createContext<CarouselContext>('Carousel')
