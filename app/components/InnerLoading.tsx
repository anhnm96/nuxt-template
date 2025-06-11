import type { SetupContext } from 'vue'
import { Spinner } from '#components'

export default function InnerFunctional(_props: any, { slots }: SetupContext) {
  return (
    <div class="absolute inset-0 grid place-items-center bg-white/60 text-xl">
      {slots.default ? slots.default() : <Spinner />}
    </div>
  )
}
