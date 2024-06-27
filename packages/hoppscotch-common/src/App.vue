<template>
  <div>
    <div
      v-if="isLoadingInitialRoute"
      class="flex min-h-screen flex-col items-center justify-center"
    >
      <HoppSmartSpinner />
    </div>
    <ErrorPage v-if="errorInfo !== null" :error="errorInfo" />
    <RouterView v-else />
    <Toaster rich-colors />
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import ErrorPage, { ErrorPageData } from "~/pages/_.vue"
import { HOPP_MODULES } from "@modules/."
import { isLoadingInitialRoute } from "@modules/router"
import { useI18n } from "@composables/i18n"
import { APP_IS_IN_DEV_MODE } from "@helpers/dev"
import { platform } from "./platform"
import { Toaster } from "@hoppscotch/ui"

const t = useI18n()

const errorInfo = ref<ErrorPageData | null>(null)

// App Crash Handler
// If the below code gets more complicated, move this onto a module
const formatErrorMessage = (err: Error | null | undefined) => {
  if (!err) return null
  return `${err.name}: ${err.message}`
}

// App Crash Handler is only a thing in Dev Mode
if (APP_IS_IN_DEV_MODE) {
  window.onerror = (_, _1, _2, _3, err) => {
    errorInfo.value = {
      statusCode: 500,
      message: formatErrorMessage(err) ?? t("error.something_went_wrong"),
    }

    // Returning false here will not cancel the error and will log it to console
    return false
  }
}

// Run module root component setup code
HOPP_MODULES.forEach((mod) => mod.onRootSetup?.())
platform.addedHoppModules?.forEach((mod) => mod.onRootSetup?.())
</script>
