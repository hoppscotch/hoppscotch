<template>
  <div class="flex flex-col flex-1">
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <label class="font-semibold truncate text-secondaryLight">
        {{ t("test.javascript_code") }}
      </label>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/getting-started/rest/tests"
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
        <div ref="testScriptEditor" class="h-full"></div>
      </div>
      <div
        class="sticky flex-shrink-0 h-full p-4 overflow-auto overflow-x-auto bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9"
      >
        <div class="pb-2 text-secondaryLight">
          {{ t("helpers.post_request_tests") }}
        </div>
        <HoppSmartAnchor
          :label="`${t('test.learn')}`"
          to="https://docs.hoppscotch.io/documentation/getting-started/rest/tests"
          blank
        />
        <h4 class="pt-6 font-bold text-secondaryLight">
          {{ t("test.snippets") }}
        </h4>
        <div class="flex flex-col pt-4">
          <TabSecondary
            v-for="(snippet, index) in testSnippets"
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
import testSnippets from "~/helpers/testSnippets"
import { useCodemirror } from "@composables/codemirror"
import linter from "~/helpers/editor/linting/testScript"
import completer from "~/helpers/editor/completion/testScript"
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"

const t = useI18n()

const props = defineProps<{
  modelValue: string
}>()
const emit = defineEmits(["update:modelValue"])
const testScript = useVModel(props, "modelValue", emit)
const testScriptEditor = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  testScriptEditor,
  testScript,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      lineWrapping: linewrapEnabled,
      placeholder: `${t("test.javascript_code")}`,
    },
    linter,
    completer,
    environmentHighlights: false,
  })
)

const useSnippet = (script: string) => {
  testScript.value += script
}

const clearContent = () => {
  testScript.value = ""
}
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}
</style>
