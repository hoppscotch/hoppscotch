<template>
  <div
    v-if="isSelected && isNotAvailable"
    class="flex flex-col items-left my-2 text-secondaryLight"
  >
    <div class="text-secondaryLight">
      <span v-if="extensionVersion">
        {{
          `${t("settings.extension_version")}: v${extensionVersion.major}.${
            extensionVersion.minor
          }`
        }}
      </span>
      <span v-else>
        {{ t("settings.extension_version") }}:
        {{ t("settings.extension_ver_not_reported") }}
      </span>
    </div>
    <div class="flex gap-2 py-2 w-fit">
      <HoppSmartItem
        to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
        blank
        :icon="IconChrome"
        label="Chrome"
        outline
        class="w-28"
      />
      <HoppSmartItem
        to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
        blank
        :icon="IconFirefox"
        label="Firefox"
        outline
        class="w-28"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useService } from "dioc/vue"
import { useI18n } from "@composables/i18n"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"
import { ExtensionKernelInterceptorService } from "~/platform/std/kernel-interceptors/extension"

import IconChrome from "~icons/brands/chrome"
import IconFirefox from "~icons/brands/firefox"

const t = useI18n()
const extensionInterceptorService = useService(
  ExtensionKernelInterceptorService
)
const interceptorService = useService(KernelInterceptorService)

const isSelected = computed(
  () => interceptorService.current.value?.id === "extension"
)

const isNotAvailable = computed(
  () => extensionInterceptorService.extensionStatus.value !== "available"
)

const extensionVersion = computed(
  () => extensionInterceptorService.extensionVersion.value
)
</script>
