<template>
  <div class="font-sans min-h-screen flex flex-col">
    <div class="p-5 flex flex-col flex-grow gap-y-2">
      <h1 class="font-bold text-lg text-white">Agent Registration Request</h1>

      <p class="tracking-wide">
        An app is trying to register against the Hoppscotch Agent. If this was intentional, copy the given token into
        the app to complete the registration process. Please close the window if you did not initiate this request.
      </p>

      <p class="font-bold text-5xl tracking-wider text-center pt-10 text-white">
        {{ codeText }}
      </p>
    </div>

    <div class="border-t border-divider p-5 flex justify-between">
      <HoppButtonSecondary
        label="Copy Code"
        outline
        filled
        :icon="copyIcon"
        @click="copyCode"
      />

      <HoppButtonPrimary
        label="Close"
        outline
        @click="closeWindow"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, markRaw } from "vue"
import { HoppButtonPrimary, HoppButtonSecondary } from "@hoppscotch/ui"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import { useClipboard, refAutoReset } from "@vueuse/core"
import { getCurrentWindow } from "@tauri-apps/api/window"

const { copy } = useClipboard()

const codeText = ref("654321")

const copyIcon = refAutoReset(markRaw(IconCopy), 3000)

function copyCode() {
  copyIcon.value = markRaw(IconCheck)
  copy(codeText.value)
}

function closeWindow() {
  const currentWindow = getCurrentWindow()

  currentWindow.close()
}
</script>
