<template>
  <div class="flex flex-col flex-1">
    <div
      class="bg-primary border-b border-dividerLight flex flex-1 top-lowerSecondaryStickyFold pl-4 z-10 sticky items-center justify-between"
    >
      <label class="font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="wrap-text"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-if="response.body"
          v-tippy="{ theme: 'tooltip' }"
          :title="
            previewEnabled ? t('hide.preview') : t('response.preview_html')
          "
          :svg="!previewEnabled ? 'eye' : 'eye-off'"
          @click.native.prevent="togglePreview"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.download_file')"
          :svg="downloadIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          v-if="response.body"
          ref="copyResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :svg="copyIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <div v-show="!previewEnabled" ref="htmlResponse"></div>
    <iframe
      v-show="previewEnabled"
      ref="previewFrame"
      class="covers-response"
      src="about:blank"
      loading="lazy"
    ></iframe>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from "@nuxtjs/composition-api"
import usePreview from "~/components/lenses/renderers/composables/usePreview"
import useResponseBody from "~/components/lenses/renderers/composables/useResponseBody"
import useDownloadResponse from "~/components/lenses/renderers/composables/useDownloadResponse"
import useCopyResponse from "~/components/lenses/renderers/composables/useCopyResponse"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n, useToast } from "~/helpers/utils/composables"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const toast = useToast()
const url = ref("")
const htmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

const { responseBodyText } = useResponseBody(props.response)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  responseBodyText,
  toast,
  t
)
const { previewFrame, previewEnabled, togglePreview } = usePreview(
  false,
  url,
  responseBodyText
)
const { copyIcon, copyResponse } = useCopyResponse(responseBodyText, toast, t)

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
  })
)
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
