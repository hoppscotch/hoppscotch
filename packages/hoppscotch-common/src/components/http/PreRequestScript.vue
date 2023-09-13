<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("preRequest.javascript_code") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/getting-started/rest/pre-request-scripts"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
      </div>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight">
        <div ref="preRequestEditor" class="h-full"></div>
      </div>
      <div
        class="sticky flex-shrink-0 h-full p-4 overflow-auto overflow-x-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
      >
        <div class="pb-2 text-secondaryLight">
          {{ t("helpers.pre_request_script") }}
        </div>
        <HoppSmartAnchor
          :label="`${t('preRequest.learn')}`"
          to="https://docs.hoppscotch.io/documentation/getting-started/rest/pre-request-scripts"
          blank
        />
        <h4 class="pt-6 font-bold text-secondaryLight">
          {{ t("preRequest.snippets") }}
        </h4>
        <div class="flex flex-col pt-4">
          <TabSecondary
            v-for="(snippet, index) in snippets"
            :key="`snippet-${index}`"
            :label="snippet.name"
            active
            @click="useSnippet(snippet.script)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import IconTrash2 from "~icons/lucide/trash-2"
import { reactive, ref } from "vue"
import snippets from "@helpers/preRequestScriptSnippets"
import { useCodemirror } from "@composables/codemirror"
import linter from "~/helpers/editor/linting/preRequest"
import completer from "~/helpers/editor/completion/preRequest"
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"

const t = useI18n()

const props = defineProps<{
  modelValue: string
}>()
const emit = defineEmits<{
  (e: "update:modelValue", value: string): void
}>()

const preRequestScript = useVModel(props, "modelValue", emit)

const preRequestEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  preRequestEditor,
  preRequestScript,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      lineWrapping: linewrapEnabled,
      placeholder: `${t("preRequest.javascript_code")}`,
    },
    linter,
    completer,
    environmentHighlights: false,
  })
)

const useSnippet = (script: string) => {
  preRequestScript.value += script
}

const clearContent = () => {
  preRequestScript.value = ""
}
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}
</style>
