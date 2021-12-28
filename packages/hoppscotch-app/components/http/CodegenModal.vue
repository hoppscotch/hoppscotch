<template>
  <SmartModal
    v-if="show"
    :title="`${t('request.generate_code')}`"
    @close="hideModal"
  >
    <template #body>
      <div class="flex flex-col px-2">
        <label for="requestType" class="px-4 pb-4">
          {{ t("request.choose_language") }}
        </label>
        <tippy ref="options" interactive trigger="click" theme="popover" arrow>
          <template #trigger>
            <span class="select-wrapper">
              <ButtonSecondary
                :label="
                  CodegenDefinitions.find((x) => x.name === codegenType).caption
                "
                outline
                class="flex-1 pr-8"
              />
            </span>
          </template>
          <SmartItem
            v-for="codegen in CodegenDefinitions"
            :key="codegen.name"
            :label="codegen.caption"
            :info-icon="codegen.name === codegenType ? 'done' : ''"
            :active-info-icon="codegen.name === codegenType"
            @click.native="
              () => {
                codegenType = codegen.name
                options.tippy().hide()
              }
            "
          />
        </tippy>
        <div class="flex justify-between flex-1">
          <label for="generatedCode" class="p-4">
            {{ t("request.generated_code") }}
          </label>
        </div>
        <div
          v-if="codegenType"
          ref="generatedCode"
          class="border rounded border-dividerLight"
        ></div>
      </div>
    </template>
    <template #footer>
      <span class="flex">
        <ButtonPrimary
          :label="`${t('action.copy')}`"
          :svg="copyIcon"
          @click.native="copyRequestCode"
        />
        <ButtonSecondary
          :label="`${t('action.dismiss')}`"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "@nuxtjs/composition-api"
import * as O from "fp-ts/Option"
import { useCodemirror } from "~/helpers/editor/codemirror"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { getEffectiveRESTRequest } from "~/helpers/utils/EffectiveURL"
import { getCurrentEnvironment } from "~/newstore/environments"
import { getRESTRequest } from "~/newstore/RESTSession"
import { useI18n, useToast } from "~/helpers/utils/composables"
import {
  CodegenDefinitions,
  CodegenName,
  generateCode,
} from "~/helpers/new-codegen"

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
const copyIcon = ref("copy")

const requestCode = computed(() => {
  const effectiveRequest = getEffectiveRESTRequest(
    request.value as any,
    getCurrentEnvironment()
  )

  const result = generateCode(codegenType.value, effectiveRequest)

  if (O.isSome(result)) {
    return result.value
  } else {
    // TODO: Error logic?
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
  copyIcon.value = "check"
  toast.success(`${t("state.copied_to_clipboard")}`)
  setTimeout(() => (copyIcon.value = "copy"), 1000)
}
</script>
