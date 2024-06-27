import { toast as sonner } from "@hoppscotch/ui"
import * as E from "fp-ts/Either"
import { markRaw } from "vue"

import WhatsNewDialog from "~/components/app/WhatsNewDialog.vue"
import { getService } from "~/modules/dioc"
import { InterceptorService } from "~/services/interceptor.service"
import { PersistenceService } from "~/services/persistence"
import { version as hoppscotchCommonPkgVersion } from "./../../package.json"

export const useWhatsNewDialog = async function () {
  const persistenceService = getService(PersistenceService)

  const versionFromLocalStorage = persistenceService.getLocalConfig("hopp_v")

  // Set new entry `hopp_v` under `localStorage` if not present
  if (!versionFromLocalStorage) {
    persistenceService.setLocalConfig("hopp_v", hoppscotchCommonPkgVersion)
    return
  }

  // Already on the latest version
  if (versionFromLocalStorage === hoppscotchCommonPkgVersion) {
    return
  }

  const getMajorVersion = (v: string) => v.split(".").slice(0, 2).join(".")

  const majorVersionFromLocalStorage = getMajorVersion(versionFromLocalStorage)
  const hoppscotchCommonPkgMajorVersion = getMajorVersion(
    hoppscotchCommonPkgVersion
  )

  // Skipping the minor version update. e.g. 2024.1.0 -> 2024.1.1
  // Checking major version update. e.g. 2024.1 -> 2024.2

  // Show the release notes during a major version update
  if (majorVersionFromLocalStorage !== hoppscotchCommonPkgMajorVersion) {
    const notesUrl = await getReleaseNotes(hoppscotchCommonPkgMajorVersion)
    if (notesUrl) {
      sonner.custom(markRaw(WhatsNewDialog), {
        componentProps: {
          notesUrl,
          version: hoppscotchCommonPkgVersion,
        },
      })
    }
  }

  persistenceService.setLocalConfig("hopp_v", hoppscotchCommonPkgVersion)
}

async function getReleaseNotes(v: string): Promise<string | undefined> {
  const interceptorService = getService(InterceptorService)

  const res = await interceptorService.runRequest({
    url: `https://releases.hoppscotch.com/releases/${v}.json`,
  }).response

  if (E.isLeft(res) || res.right.status !== 200) {
    return
  }

  if (!(res.right.data instanceof ArrayBuffer)) {
    return
  }

  try {
    const data = JSON.parse(new TextDecoder().decode(res.right.data))
    return data.release_notes
  } catch (err) {
    console.error(err)
  }
}
