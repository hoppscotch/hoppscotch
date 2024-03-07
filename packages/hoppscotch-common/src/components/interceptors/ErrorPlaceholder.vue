<template>
  <HoppSmartPlaceholder
    :src="`/images/states/${colorMode.value}/upload_error.svg`"
    :alt="`${t('error.network_fail')}`"
    :heading="t('error.network_fail')"
  >
    <template #body>
      <div class="my-1 flex flex-col items-center text-secondaryLight">
        <span>
          {{ t("error.please_install_extension") }}
        </span>
        <span>
          {{ t("error.check_how_to_add_origin") }}
          <HoppSmartLink
            blank
            to="https://docs.hoppscotch.io/documentation/features/interceptor#browser-extension"
            class="text-accent hover:text-accentDark"
          >
            here
          </HoppSmartLink>
        </span>
      </div>
      <div class="flex flex-col space-y-2 py-4">
        <HoppSmartItem
          to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
          blank
          :icon="IconChrome"
          label="Chrome"
          :info-icon="hasChromeExtInstalled ? IconCheckCircle : null"
          :active-info-icon="hasChromeExtInstalled"
          outline
        />
        <HoppSmartItem
          to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
          blank
          :icon="IconFirefox"
          label="Firefox"
          :info-icon="hasFirefoxExtInstalled ? IconCheckCircle : null"
          :active-info-icon="hasFirefoxExtInstalled"
          outline
        />
      </div>
      <div class="space-y-4 py-4">
        <div class="flex items-center">
          <HoppSmartToggle
            :on="extensionEnabled"
            @change="extensionEnabled = !extensionEnabled"
          >
            {{ t("settings.extensions_use_toggle") }}
          </HoppSmartToggle>
        </div>
      </div>
    </template>
  </HoppSmartPlaceholder>
</template>

<script setup lang="ts">
import IconChrome from "~icons/brands/chrome"
import IconFirefox from "~icons/brands/firefox"
import IconCheckCircle from "~icons/lucide/check-circle"
import { useI18n } from "@composables/i18n"
import { ExtensionInterceptorService } from "~/platform/std/interceptors/extension"
import { useService } from "dioc/vue"
import { computed } from "vue"
import { InterceptorService } from "~/services/interceptor.service"
import { platform } from "~/platform"
import { useColorMode } from "~/composables/theming"

const colorMode = useColorMode()
const t = useI18n()

const interceptorService = useService(InterceptorService)
const extensionService = useService(ExtensionInterceptorService)

const hasChromeExtInstalled = extensionService.chromeExtensionInstalled
const hasFirefoxExtInstalled = extensionService.firefoxExtensionInstalled

const extensionEnabled = computed({
  get() {
    return (
      interceptorService.currentInterceptorID.value ===
      extensionService.interceptorID
    )
  },
  set(active) {
    if (active) {
      interceptorService.currentInterceptorID.value =
        extensionService.interceptorID
    } else {
      interceptorService.currentInterceptorID.value =
        platform.interceptors.default
    }
  },
})
</script>
