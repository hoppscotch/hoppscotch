<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${
            previewEnabled ? t('hide.preview') : t('response.preview_html')
          } <kbd>${getSpecialKey()}</kbd><kbd>Shift</kbd><kbd>P</kbd>`"
          :icon="!previewEnabled ? IconEye : IconEyeOff"
          @click.prevent="togglePreview"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.download_file'
          )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
          :icon="downloadIcon"
          @click="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'action.copy'
          )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
          :icon="copyIcon"
          @click="copyResponse"
        />
      </div>
    </div>
    <div
      v-show="!previewEnabled"
      ref="htmlResponse"
      class="flex flex-col flex-1"
    ></div>
    <iframe
      v-show="previewEnabled"
      ref="previewFrame"
      class="covers-response"
      src="about:blank"
      loading="lazy"
      sandbox=""
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconEye from "~icons/lucide/eye"
import IconEyeOff from "~icons/lucide/eye-off"
import { ref, reactive } from "vue"
import {
  usePreview,
  useResponseBody,
  useCopyResponse,
  useDownloadResponse,
} from "@composables/lens-actions"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import type { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse & { type: "success" | "fail" }
}>()

const htmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

const { responseBodyText } = useResponseBody(props.response)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "text/html",
  responseBodyText
)
const { previewFrame, previewEnabled, togglePreview } = usePreview(
  false,
  responseBodyText
)
const { copyIcon, copyResponse } = useCopyResponse(responseBodyText)

useCodemirror(
  htmlResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "htmlmixed",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)

defineActionHandler("response.preview.toggle", () => togglePreview())
defineActionHandler("response.file.download", () => downloadResponse())
defineActionHandler("response.copy", () => copyResponse())
</script>

<style lang="scss" scoped>
.covers-response {
  @apply bg-white;
  @apply h-full;
  @apply w-full;
  @apply border;
  @apply border-dividerLight;
  @apply z-5;
}
</style>
