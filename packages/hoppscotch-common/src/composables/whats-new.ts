import { toast as sonner } from "@hoppscotch/ui"
import { markRaw } from "vue"
import WhatsNewDialog from "~/components/app/WhatsNewDialog.vue"
import { getService } from "~/modules/dioc"
import { PersistenceService } from "~/services/persistence"
import { version } from "./../../package.json"
import { InterceptorService } from "~/services/interceptor.service"
import * as E from "fp-ts/Either"

export const useWhatsNewDialog = async function () {
  const persistenceService = getService(PersistenceService)

  const oldVersion = persistenceService.getLocalConfig("hopp_v")
  if (oldVersion === version) return

  const latestMajorVersion = version.split(".").slice(0, 2).join(".")

  // Skipping the minor version update. e.g. 2024.1.0 -> 2024.1.1
  // Checking major version update. e.g. 2024.1 -> 2024.2

  const isUpdatedToLatestMajorVersion =
    oldVersion?.split(".").slice(0, 2).join(".") != latestMajorVersion // If the major version is different from the old version

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
  const interceptorService = getService(InterceptorService)

  const res = await interceptorService.runRequest({
    url: `https://releases.hoppscotch.com/releases/${v}.json`,
  }).response

  if (E.isLeft(res) || res.right.status !== 200) return

  return (res.right.data as any).release_notes
}
