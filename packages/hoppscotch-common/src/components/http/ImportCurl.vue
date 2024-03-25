<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('import.curl')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="rounded border border-dividerLight">
        <div class="flex flex-col">
          <div class="flex items-center justify-between pl-4">
            <label class="truncate font-semibold text-secondaryLight">
              cURL
            </label>
            <div class="flex items-center">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear_all')"
                :icon="IconTrash2"
                @click="clearContent()"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('state.linewrap')"
                :class="{ '!text-accent': WRAP_LINES }"
                :icon="IconWrapText"
                @click.prevent="toggleNestedSetting('WRAP_LINES', 'importCurl')"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                :title="t('action.download_file')"
                :icon="downloadIcon"
                @click="downloadResponse"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip', allowHTML: true }"
                :title="t('action.copy')"
                :icon="copyIcon"
                @click="copyResponse"
              />
            </div>
          </div>
          <div class="h-46">
            <div
              ref="curlEditor"
              class="h-full rounded-b border-t border-dividerLight"
            ></div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          ref="importButton"
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :label="`${t('import.title')}`"
          :title="`${t(
            'import.title'
          )} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
          outline
          @click="handleImport"
        />
        <HoppButtonSecondary
          :label="`${t('action.cancel')}`"
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t('action.cancel')} <kbd>ESC</kbd>`"
          outline
          filled
          @click="hideModal"
        />
      </span>
      <span class="flex">
        <HoppButtonSecondary
          :icon="pasteIcon"
          :label="`${t('action.paste')}`"
          filled
          outline
          @click="handlePaste"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { markRaw, reactive, ref, watch } from "vue"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { parseCurlToHoppRESTReq } from "~/helpers/curl"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"

import IconWrapText from "~icons/lucide/wrap-text"
import IconClipboard from "~icons/lucide/clipboard"
import IconCheck from "~icons/lucide/check"
import IconTrash2 from "~icons/lucide/trash-2"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { platform } from "~/platform"
import { RESTTabService } from "~/services/tab/rest"
import { useService } from "dioc/vue"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { EditorView, keymap } from "@codemirror/view"
import { Prec } from "@codemirror/state"

const t = useI18n()

const toast = useToast()

const tabs = useService(RESTTabService)

const curl = ref("")

const curlEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "importCurl")

const props = defineProps<{ show: boolean; text: string }>()

useCodemirror(
  curlEditor,
  curl,
  reactive({
    extendedEditorConfig: {
      mode: "application/x-sh",
      placeholder: `${t("request.enter_curl")}`,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
    onInit: (view: EditorView) => view.focus(),
    additionalExts: [
      markRaw(
        Prec.highest(
          keymap.of([
            {
              key: "Mod-Enter", // 'Ctrl-Enter' on Windows, 'Cmd-Enter' on macOS
              preventDefault: true,
              run: () => {
                handleImport()
                return true
              },
            },
          ])
        )
      ),
    ],
  })
)

watch(
  () => props.show,
  () => {
    if (props.show) {
      curl.value = props.text.toString()
    }
  },
  { immediate: false }
)

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}

const handleImport = () => {
  const text = curl.value
  try {
    const req = parseCurlToHoppRESTReq(text)

    platform.analytics?.logEvent({
      type: "HOPP_REST_IMPORT_CURL",
    })

    tabs.currentActiveTab.value.document.request = req
  } catch (e) {
    console.error(e)
    toast.error(`${t("error.curl_invalid_format")}`)
  }
  hideModal()
}

const pasteIcon = refAutoReset<typeof IconClipboard | typeof IconCheck>(
  IconClipboard,
  1000
)

const handlePaste = async () => {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      curl.value = text
      pasteIcon.value = IconCheck
    }
  } catch (e) {
    console.error("Failed to copy: ", e)
    toast.error(t("profile.no_permission").toString())
  }
}

const { copyIcon, copyResponse } = useCopyResponse(curl)
const { downloadIcon, downloadResponse } = useDownloadResponse("", curl)

const clearContent = () => {
  curl.value = ""
}
</script>
