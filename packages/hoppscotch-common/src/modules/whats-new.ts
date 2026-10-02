import { useWhatsNewDialog } from "~/composables/whats-new"
import { HoppModule } from "."
import { platform } from "~/platform"

export default <HoppModule>{
  onRootSetup() {
    if (platform.platformFeatureFlags.showWhatsNew === false) return
    useWhatsNewDialog()
  },
}
