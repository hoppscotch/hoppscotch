<template>
  <div class="flex flex-1 flex-col overflow-auto whitespace-nowrap">
    <div
      class="sticky top-0 z-50 flex-none flex-shrink-0 items-center justify-center whitespace-nowrap bg-primary p-4"
    >
      <div class="flex flex-1 flex-col">
        <div class="flex items-center text-tiny font-semibold">
          <div class="inline-flex flex-1 space-x-4">
            <div class="flex-1 flex items-center space-x-2">
              <span class="text-secondary">{{ t("response.status") }}:</span>
              <div class="flex-1 flex whitespace-nowrap max-w-xs">
                <SmartEnvInput
                  v-model="statusText"
                  :auto-complete-source="statusCodeOptions"
                  class="flex-1 border border-divider"
                  @update:model-value="setResponseStatusCode"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="flex flex-1 flex-col">
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("response.title") }}
        </label>
        <div class="flex items-center">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': WRAP_LINES }"
            :icon="IconWrapText"
            @click.prevent="
              toggleNestedSetting('WRAP_LINES', 'graphqlResponseBody')
            "
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.prettify')"
            :icon="prettifyIcon"
            @click="prettifyBody"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t('action.download_file')} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
            :icon="downloadIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t('action.copy')} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
            :icon="copyIcon"
            @click="copyResponse"
          />
        </div>
      </div>
      <div class="h-full relative overflow-auto flex flex-col flex-1">
        <div ref="bodyEditor" class="absolute inset-0 h-full"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconWand from "~icons/lucide/wand"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import { computed, reactive, ref } from "vue"
import { refAutoReset, useVModel } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import {
  getFullStatusCodePhrase,
  getStatusCodePhrase,
  getStatusAndCode,
  isValidStatusCode,
} from "~/helpers/utils/statusCodes"
import jsonLinter from "~/helpers/editor/linting/json"
import { HoppSavedGQLExampleDocument } from "~/helpers/rest/document"

const t = useI18n()
const toast = useToast()

const props = defineProps<{ document: HoppSavedGQLExampleDocument }>()

const emit = defineEmits<{
  (e: "update:document", val: HoppSavedGQLExampleDocument): void
}>()

const doc = useVModel(props, "document", emit)

const bodyEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "graphqlResponseBody")

const bodyString = computed({
  get: () => doc.value.response.body,
  set: (val) => {
    doc.value.response.body = val
  },
})

useCodemirror(
  bodyEditor,
  bodyString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      lineWrapping: WRAP_LINES,
    },
    linter: computed(() => (bodyString.value.length > 0 ? jsonLinter : null)),
    completer: null,
    environmentHighlights: false,
  })
)

const statusText = ref(
  getStatusCodePhrase(doc.value.response.code, doc.value.response.status)
)
const statusCodeOptions = computed(() => getFullStatusCodePhrase())

const setResponseStatusCode = (val: string) => {
  if (!isValidStatusCode(val)) {
    doc.value.response.status = val
    doc.value.response.code = null
    return
  }
  doc.value.response.code = getStatusAndCode(val).code
  doc.value.response.status = getStatusAndCode(val).status
}

const prettifyIcon = refAutoReset<
  typeof IconWand | typeof IconCheck | typeof IconInfo
>(IconWand, 1000)

const prettifyBody = () => {
  try {
    bodyString.value = JSON.stringify(JSON.parse(bodyString.value), null, 2)
    prettifyIcon.value = IconCheck
  } catch {
    prettifyIcon.value = IconInfo
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}

const { copyIcon, copyResponse } = useCopyResponse(bodyString)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  bodyString,
  t("filename.graphql_response")
)
</script>
