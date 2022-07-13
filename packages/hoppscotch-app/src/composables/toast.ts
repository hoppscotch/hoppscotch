import { Toasted } from "@clayzar/vue-toasted"
import { getCurrentInstance } from "vue"

export const useToast = () => {
  const inst = getCurrentInstance()

  // The toasted plugin we use is not exactly Vue 3 friendly, see modules/toast for more info
  return (inst as any).appContext.config.globalProperties.$toasted as Toasted
}
