import { toast as sonner } from "@hoppscotch/ui"
import { markRaw } from "vue"
import WhatsNewDialog from "~/components/app/WhatsNewDialog.vue"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"
import { version } from "./../../package.json"

export const useWhatsNewDialog = async function () {
  const persistenceService = getService(PersistenceService)

  const oldVersion = persistenceService.getLocalConfig("hopp_v")
  const latestMajorVersion = version.split(".").slice(0, 2).join(".")

  if (oldVersion === version) return

  // Skipping the minor version update. e.g. 2024.1.0 -> 2024.1.1
  // Checking major version update. e.g. 2024.1 -> 2024.2

  const isUpdatedToLatestMajorVersion =
    oldVersion?.split(".").slice(0, 2).join(".") === latestMajorVersion

  if (isUpdatedToLatestMajorVersion) {
    const notesUrl = await getReleaseNotes(latestMajorVersion)
    if (notesUrl) {
      sonner.custom(markRaw(WhatsNewDialog), {
        componentProps: {
          notesUrl,
          version,
        },
      })
    }
  }

  persistenceService.setLocalConfig("hopp_v", version)
}

async function getReleaseNotes(v: string) {
  const res = await fetch(`https://releases.hoppscotch.com/releases/${v}.json`)
  const { release_notes } = await res.json()
  return release_notes
}
