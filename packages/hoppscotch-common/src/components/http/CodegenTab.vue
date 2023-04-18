<template>
  <div
    class="sticky top-0 z-10 flex flex-col flex-shrink-0 overflow-x-auto border-b bg-primary border-dividerLight"
  >
    <WorkspaceCurrent :section="t('show.code')" />
    <div class="flex flex-col mt-2">
      <label for="requestType" class="px-4 pb-1">
        {{ t("request.choose_language") }}
      </label>
      <tippy
        interactive
        trigger="click"
        theme="popover"
        placement="bottom"
        :on-shown="() => tippyActions.focus()"
      >
        <span class="select-wrapper">
          <HoppButtonSecondary
            :label="
              CodegenDefinitions.find((x) => x.name === codegenType).caption
            "
            outline
            class="flex-1"
          />
        </span>
        <template #content="{ hide }">
          <div class="flex flex-col space-y-2">
            <div class="sticky z-10 top-0 flex-shrink-0 overflow-x-auto">
              <input
                v-model="searchQuery"
                type="search"
                autocomplete="off"
                class="flex w-full p-4 py-2 input !bg-primaryContrast"
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
              <div
                v-if="
                  !(
                    filteredCodegenDefinitions.length !== 0 ||
                    CodegenDefinitions.length === 0
                  )
                "
                class="flex flex-col items-center justify-center p-4 text-secondaryLight"
              >
                <icon-lucide-search class="pb-2 opacity-75 svg-icons" />
                <span class="my-2 text-center">
                  {{ t("state.nothing_found") }} "{{ searchQuery }}"
                </span>
              </div>
            </div>
          </div>
        </template>
      </tippy>
      <div
        v-if="errorState"
        class="w-full px-4 py-2 mt-4 overflow-auto font-mono text-red-400 whitespace-normal rounded bg-primaryLight"
      >
        {{ t("error.something_went_wrong") }}
      </div>
      <div
        v-else-if="codegenType"
        class="mt-4 border rounded border-dividerLight"
      >
        <div class="flex items-center justify-between pl-4">
          <label class="font-semibold truncate text-secondaryLight">
            {{ t("request.generated_code") }}
          </label>
          <div class="flex items-center">
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('state.linewrap')"
              :class="{ '!text-accent': linewrapEnabled }"
              :icon="IconWrapText"
              @click.prevent="linewrapEnabled = !linewrapEnabled"
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
          class="border-t rounded-b border-dividerLight"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import * as O from "fp-ts/Option"
import { Environment, makeRESTRequest } from "@hoppscotch/data"
import { useCodemirror } from "@composables/codemirror"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"
import { getAggregateEnvs } from "~/newstore/environments"
import { useI18n } from "@composables/i18n"
import {
  CodegenDefinitions,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"

import IconCheck from "~icons/lucide/check"
import IconWrapText from "~icons/lucide/wrap-text"
import { currentActiveTab } from "~/helpers/rest/tab"
import cloneDeep from "lodash-es/cloneDeep"

const t = useI18n()

const request = ref(cloneDeep(currentActiveTab.value.document.request))
const codegenType = ref<CodegenName>("shell-curl")
const errorState = ref(false)

const requestCode = computed(() => {
  const aggregateEnvs = getAggregateEnvs()
  const env: Environment = {
    name: "Env",
    variables: aggregateEnvs,
  }
  const effectiveRequest = getEffectiveRESTRequest(request.value, env)

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
    })
  )

  if (O.isSome(result)) {
    errorState.value = false
    return result.value
  } else {
    errorState.value = true
    return ""
  }
})

// Template refs
const tippyActions = ref<any | null>(null)
const generatedCode = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  generatedCode,
  requestCode,
  reactive({
    extendedEditorConfig: {
      mode: "text/plain",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

watch(
  () => currentActiveTab,
  (newCurrentActiveTab) => {
    request.value = cloneDeep(newCurrentActiveTab.value.document.request)
  },
  { deep: true }
)

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
