import { inject } from "vue"
import { HoppColorMode } from "~/modules/theming"

export const useColorMode = () => inject("colorMode") as HoppColorMode
