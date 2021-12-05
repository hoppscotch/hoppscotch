<template>
  <div>
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
    <div ref="xmlResponse"></div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive } from "@nuxtjs/composition-api"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n, useToast } from "~/helpers/utils/composables"
import useResponseBody from "~/components/lenses/renderers/composables/useResponseBody"
import useDownloadResponse from "~/components/lenses/renderers/composables/useDownloadResponse"
import useCopyResponse from "~/components/lenses/renderers/composables/useCopyResponse"

const t = useI18n()

const props = defineProps<{
  response: HoppRESTResponse
}>()

const toast = useToast()

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
  responseBodyText,
  toast,
  t
)

const { copyIcon, copyResponse } = useCopyResponse(responseBodyText, toast, t)

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
  })
)
</script>
