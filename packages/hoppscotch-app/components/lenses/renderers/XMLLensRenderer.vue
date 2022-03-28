<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
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
    <div ref="xmlResponse" class="flex flex-col flex-1"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n } from "~/helpers/utils/composables"
import useResponseBody from "~/helpers/lenses/composables/useResponseBody"
import useDownloadResponse from "~/helpers/lenses/composables/useDownloadResponse"
import useCopyResponse from "~/helpers/lenses/composables/useCopyResponse"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const { responseBodyText } = useResponseBody(props.response)

const responseType = computed(() => {
  return (
    props.response.headers.find((h) => h.key.toLowerCase() === "content-type")
      .value || ""
  )
    .split(";")[0]
    .toLowerCase()
})

const { downloadIcon, downloadResponse } = useDownloadResponse(
  responseType.value,
  responseBodyText
)

const { copyIcon, copyResponse } = useCopyResponse(responseBodyText)

const xmlResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  xmlResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "application/xml",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
  })
)
</script>
