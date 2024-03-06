<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('request.generate_code')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col">
        <label for="requestType" class="px-4 pb-4">
          {{ t("request.choose_language") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          placement="bottom"
          :on-shown="() => tippyActions.focus()"
        >
          <HoppSmartSelectWrapper>
            <HoppButtonSecondary
              :label="
                CodegenDefinitions.find((x) => x.name === codegenType)!.caption
              "
              outline
              class="flex-1 pr-8"
            />
          </HoppSmartSelectWrapper>
          <template #content="{ hide }">
            <div class="flex flex-col space-y-2">
              <div class="sticky top-0 z-10 flex-shrink-0 overflow-x-auto">
                <input
                  v-model="searchQuery"
                  type="search"
                  autocomplete="off"
                  class="input flex w-full !bg-primaryContrast p-4 py-2"
                  :placeholder="`${t('action.search')}`"
                />
              </div>
              <div
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  v-for="codegen in filteredCodegenDefinitions"
                  :key="codegen.name"
                  :label="codegen.caption"
                  :info-icon="codegen.name === codegenType ? IconCheck : null"
                  :active-info-icon="codegen.name === codegenType"
                  @click="
                    () => {
                      codegenType = codegen.name
                      hide()
                    }
                  "
                />
                <HoppSmartPlaceholder
                  v-if="filteredCodegenDefinitions.length === 0"
                  :text="`${t('state.nothing_found')} ‟${searchQuery}”`"
                >
                  <template #icon>
                    <icon-lucide-search class="svg-icons opacity-75" />
                  </template>
                </HoppSmartPlaceholder>
              </div>
            </div>
          </template>
        </tippy>
        <div
          v-if="errorState"
          class="mt-4 w-full overflow-auto whitespace-normal rounded bg-primaryLight px-4 py-2 font-mono text-red-400"
        >
          {{ t("error.something_went_wrong") }}
        </div>
        <div
          v-else-if="codegenType"
          class="mt-4 rounded border border-dividerLight"
        >
          <div class="flex items-center justify-between pl-4">
            <label class="truncate font-semibold text-secondaryLight">
              {{ t("request.generated_code") }}
            </label>
            <div class="flex items-center">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('state.linewrap')"
                :class="{ '!text-accent': WRAP_LINES }"
                :icon="IconWrapText"
                @click.prevent="toggleNestedSetting('WRAP_LINES', 'codeGen')"
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
          <div
            ref="generatedCode"
            class="rounded-b border-t border-dividerLight"
          ></div>
        </div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="`${t('action.copy')}`"
          :icon="copyCodeIcon"
          outline
          @click="copyRequestCode"
        />
        <HoppButtonSecondary
          :label="`${t('action.dismiss')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import * as O from "fp-ts/Option"
import { Environment, makeRESTRequest } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"
import { getAggregateEnvs } from "~/newstore/environments"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  CodegenDefinitions,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"

import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconWrapText from "~icons/lucide/wrap-text"
import cloneDeep from "lodash-es/cloneDeep"
import { platform } from "~/platform"
import { RESTTabService } from "~/services/tab/rest"
import { useService } from "dioc/vue"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const toast = useToast()

const tabs = useService(RESTTabService)
const request = ref(cloneDeep(tabs.currentActiveTab.value.document.request))
const codegenType = ref<CodegenName>("shell-curl")
const errorState = ref(false)

const copyCodeIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const requestCode = computed(() => {
  const aggregateEnvs = getAggregateEnvs()
  const requestVariables = request.value.requestVariables.map(
    (requestVariable) => {
      if (requestVariable.active)
        return {
          key: requestVariable.key,
          value: requestVariable.value,
          secret: false,
        }
      return {}
    }
  )
  const env: Environment = {
    v: 1,
    id: "env",
    name: "Env",
    variables: [
      ...(requestVariables as Environment["variables"]),
      ...aggregateEnvs,
    ],
  }
  const effectiveRequest = getEffectiveRESTRequest(request.value, env)

  if (!props.show) return ""

  const result = generateCode(
    codegenType.value,
    makeRESTRequest({
      ...effectiveRequest,
      body: resolvesEnvsInBody(effectiveRequest.body, env),
      headers: effectiveRequest.effectiveFinalHeaders.map((header) => ({
        ...header,
        active: true,
      })),
      params: effectiveRequest.effectiveFinalParams.map((param) => ({
        ...param,
        active: true,
      })),
      endpoint: effectiveRequest.effectiveFinalURL,
      requestVariables: effectiveRequest.effectiveFinalRequestVariables.map(
        (requestVariable) => ({
          ...requestVariable,
          active: true,
        })
      ),
    })
  )

  if (O.isSome(result)) {
    errorState.value = false
    return result.value
  }
  errorState.value = true
  return ""
})

// Template refs
const tippyActions = ref<any | null>(null)
const generatedCode = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "codeGen")

useCodemirror(
  generatedCode,
  requestCode,
  reactive({
    extendedEditorConfig: {
      mode: "text/plain",
      readOnly: true,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

watch(
  () => props.show,
  (goingToShow) => {
    if (goingToShow) {
      request.value = cloneDeep(tabs.currentActiveTab.value.document.request)

      platform.analytics?.logEvent({
        type: "HOPP_REST_CODEGEN_OPENED",
      })
    }
  }
)

const hideModal = () => emit("hide-modal")

const copyRequestCode = () => {
  copyToClipboard(requestCode.value)
  copyCodeIcon.value = IconCheck
  toast.success(`${t("state.copied_to_clipboard")}`)
}

const searchQuery = ref("")

const filteredCodegenDefinitions = computed(() => {
  return CodegenDefinitions.filter((obj) =>
    Object.values(obj).some((val) =>
      val.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})

const { copyIcon, copyResponse } = useCopyResponse(requestCode)
const { downloadIcon, downloadResponse } = useDownloadResponse("", requestCode)
</script>
