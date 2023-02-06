import { HoppModule } from "."
import HoppUI from "./../../../hoppscotch-ui/src"
import { HoppUIPluginOptions } from "@hoppscotch/ui/src"
import { useKeybindingDisabler } from "~/helpers/keybindings"
import { useI18n } from "vue-i18n"
const { disableKeybindings, enableKeybindings } = useKeybindingDisabler()

const HoppUIOptions: HoppUIPluginOptions = {
  t: (key: string) => useI18n().t(key).toString(),
  onModalOpen: disableKeybindings,
  onModalClose: enableKeybindings,
}

export default <HoppModule>{
  onVueAppInit(app) {
    // disable eslint for this line. it's a hack because there's some unknown type error
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use(HoppUI, HoppUIOptions)
  },
}
