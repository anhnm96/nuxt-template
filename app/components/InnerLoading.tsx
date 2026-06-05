import type { SetupContext } from 'vue'
import { Spinner } from '#components'

export default function InnerLoading(_props: any, { slots }: SetupContext) {
  return (
    <div class="absolute inset-0 z-(--loading) grid place-items-center bg-abg/60 backdrop-blur-xs initial:text-xl">
      {slots.default ? slots.default() : <Spinner />}
    </div>
  )
}
