import { HoppModule } from "."
import {
  changeExtensionStatus,
  ExtensionStatus,
} from "~/newstore/HoppExtension"
import { ref } from "vue"
import { defineSubscribableObject } from "~/helpers/strategies/ExtensionStrategy"

/* Module defining the hooking mechanism between Hoppscotch and the Hoppscotch Browser Extension */

export default <HoppModule>{
  onVueAppInit() {
    const extensionPollIntervalId = ref<ReturnType<typeof setInterval>>()

    if (window.__HOPP_EXTENSION_STATUS_PROXY__) {
      changeExtensionStatus(window.__HOPP_EXTENSION_STATUS_PROXY__.status)

      window.__HOPP_EXTENSION_STATUS_PROXY__.subscribe(
        "status",
        (status: ExtensionStatus) => changeExtensionStatus(status)
      )
    } else {
      const statusProxy = defineSubscribableObject({
        status: "waiting" as ExtensionStatus,
      })

      window.__HOPP_EXTENSION_STATUS_PROXY__ = statusProxy
      statusProxy.subscribe("status", (status: ExtensionStatus) =>
        changeExtensionStatus(status)
      )

      /**
       * Keeping identifying extension backward compatible
       * We are assuming the default version is 0.24 or later. So if the extension exists, its identified immediately,
       * then we use a poll to find the version, this will get the version for 0.24 and any other version
       * of the extension, but will have a slight lag.
       * 0.24 users will get the benefits of 0.24, while the extension won't break for the old users
       */
      extensionPollIntervalId.value = setInterval(() => {
        if (typeof window.__POSTWOMAN_EXTENSION_HOOK__ !== "undefined") {
          if (extensionPollIntervalId.value)
            clearInterval(extensionPollIntervalId.value)

          const version = window.__POSTWOMAN_EXTENSION_HOOK__.getVersion()

          // When the version is not 0.24 or higher, the extension wont do this. so we have to do it manually
          if (
            version.major === 0 &&
            version.minor <= 23 &&
            window.__HOPP_EXTENSION_STATUS_PROXY__
          ) {
            window.__HOPP_EXTENSION_STATUS_PROXY__.status = "available"
          }
        }
      }, 2000)
    }
  },
}
