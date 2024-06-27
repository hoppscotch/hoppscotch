import { useWhatsNewDialog } from "~/composables/whats-new"
import { HoppModule } from "."

export default <HoppModule>{
  onRootSetup() {
    useWhatsNewDialog()
  },
}
