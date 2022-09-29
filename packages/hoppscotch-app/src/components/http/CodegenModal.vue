<template>
  <SmartModal
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
          ref="options"
          placement="bottom"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <span class="select-wrapper">
            <ButtonSecondary
              :label="
                CodegenDefinitions.find((x) => x.name === codegenType).caption
              "
              outline
              class="flex-1 pr-8"
            />
          </span>
          <template #content="{ hide }">
            <div class="flex flex-col space-y-2">
              <div class="sticky top-0">
                <input
                  v-model="searchQuery"
                  type="search"
                  autocomplete="off"
                  class="flex w-full p-4 py-2 input !bg-primaryContrast"
                  :placeholder="`${t('action.search')}`"
                />
              </div>
              <div
                class="flex flex-col"
                tabindex="0"
                role="menu"
                @keyup.escape="hide()"
              >
                <SmartItem
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
        <div class="flex justify-between flex-1">
          <label for="generatedCode" class="p-4">
            {{ t("request.generated_code") }}
          </label>
        </div>
        <div
          v-if="errorState"
          class="w-full px-4 py-2 overflow-auto font-mono text-red-400 whitespace-normal rounded bg-primaryLight"
        >
          {{ t("error.something_went_wrong") }}
        </div>
        <div
          v-else-if="codegenType"
          ref="generatedCode"
          class="border rounded border-dividerLight"
        ></div>
      </div>
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <ButtonPrimary
          :label="`${t('action.copy')}`"
          :icon="copyIcon"
          outline
          @click="copyRequestCode"
        />
        <ButtonSecondary
          :label="`${t('action.dismiss')}`"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue"
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
import { getRESTRequest } from "~/newstore/RESTSession"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import {
  CodegenDefinitions,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"

import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"

const t = useI18n()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const toast = useToast()

const options = ref<any | null>(null)

const request = ref(getRESTRequest())
const codegenType = ref<CodegenName>("shell-curl")
const errorState = ref(false)

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const requestCode = computed(() => {
  const aggregateEnvs = getAggregateEnvs()
  const env: Environment = {
    name: "Env",
    variables: aggregateEnvs,
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

const generatedCode = ref<any | null>(null)

useCodemirror(generatedCode, requestCode, {
  extendedEditorConfig: {
    mode: "text/plain",
    readOnly: true,
  },
  linter: null,
  completer: null,
  environmentHighlights: false,
})

watch(
  () => props.show,
  (goingToShow) => {
    if (goingToShow) {
      request.value = getRESTRequest()
    }
  }
)

const hideModal = () => emit("hide-modal")

const copyRequestCode = () => {
  copyToClipboard(requestCode.value)
  copyIcon.value = IconCheck
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
</script>
