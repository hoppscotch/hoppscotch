<template>
  <div
    v-if="
      interceptorSelection === extensionService.interceptorID &&
      extensionService.extensionStatus.value !== 'available'
    "
    class="flex space-x-2"
  >
    <HoppButtonSecondary
      to="https://chrome.google.com/webstore/detail/hoppscotch-browser-extens/amknoiejhlmhancpahfcfcfhllgkpbld"
      blank
      :icon="IconChrome"
      label="Chrome"
      outline
      class="!flex-1"
    />
    <HoppButtonSecondary
      to="https://addons.mozilla.org/en-US/firefox/addon/hoppscotch"
      blank
      :icon="IconFirefox"
      label="Firefox"
      outline
      class="!flex-1"
    />
  </div>
</template>

<script setup lang="ts">
import IconChrome from "~icons/brands/chrome"
import IconFirefox from "~icons/brands/firefox"
import { InterceptorService } from "~/services/interceptor.service"
import { useService } from "dioc/vue"
import { ExtensionInterceptorService } from "~/platform/std/interceptors/extension"

const interceptorService = useService(InterceptorService)
const extensionService = useService(ExtensionInterceptorService)

const interceptorSelection = interceptorService.currentInterceptorID
</script>
