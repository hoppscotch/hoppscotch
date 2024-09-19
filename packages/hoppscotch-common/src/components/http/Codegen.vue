<template>
  <div class="flex flex-col">
    <label v-if="!hideLabel" for="requestType" class="px-4 pb-4">
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
              :info-icon="codegen.name === codegenType ? IconCheck : undefined"
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

<script setup lang="ts">
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { Environment, makeRESTRequest } from "@hoppscotch/data"
import * as O from "fp-ts/Option"
import { computed, reactive, ref } from "vue"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import {
  CodegenDefinitions,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"
import { getAggregateEnvs } from "~/newstore/environments"

import { useService } from "dioc/vue"
import cloneDeep from "lodash-es/cloneDeep"
import { onMounted } from "vue"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { platform } from "~/platform"
import { RESTTabService } from "~/services/tab/rest"
import IconCheck from "~icons/lucide/check"
import IconWrapText from "~icons/lucide/wrap-text"
import { asyncComputed } from "@vueuse/core"

const t = useI18n()

const tabs = useService(RESTTabService)
const request = computed(() =>
  cloneDeep(tabs.currentActiveTab.value.document.request)
)
const codegenType = ref<CodegenName>("shell-curl")
const errorState = ref(false)

defineProps({
  hideLabel: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: "request-code", value: string): void
}>()

const requestCode = asyncComputed(async () => {
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

  // Calculating this before to keep the reactivity as asyncComputed will lose
  // reactivity tracking after the await point
  const lang = codegenType.value

  const effectiveRequest = await getEffectiveRESTRequest(
    request.value,
    env,
    true
  )

  const result = generateCode(
    lang,
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
    emit("request-code", result.value)
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

onMounted(() => {
  platform.analytics?.logEvent({
    type: "HOPP_REST_CODEGEN_OPENED",
  })
})

const searchQuery = ref("")

const filteredCodegenDefinitions = computed(() => {
  return CodegenDefinitions.filter((obj) =>
    Object.values(obj).some((val) =>
      val.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  )
})

const { copyIcon, copyResponse } = useCopyResponse(requestCode)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "",
  requestCode,
  t("filename.codegen", {
    request_name: request.value.name,
  })
)
</script>
