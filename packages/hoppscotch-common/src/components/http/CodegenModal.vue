<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="`${t('request.generate_code')}`"
    @close="hideModal"
  >
    <template #body>
      <HttpCodegen />
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
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { Environment, makeRESTRequest } from "@hoppscotch/data"
import { refAutoReset } from "@vueuse/core"
import * as O from "fp-ts/Option"
import { computed, reactive, ref, watch } from "vue"
import { CodegenName, generateCode } from "~/helpers/new-codegen"
import {
  getEffectiveRESTRequest,
  resolvesEnvsInBody,
} from "~/helpers/utils/EffectiveURL"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { getAggregateEnvs } from "~/newstore/environments"

import { useService } from "dioc/vue"
import cloneDeep from "lodash-es/cloneDeep"
import { useNestedSetting } from "~/composables/settings"
import { platform } from "~/platform"
import { RESTTabService } from "~/services/tab/rest"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

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
</script>
