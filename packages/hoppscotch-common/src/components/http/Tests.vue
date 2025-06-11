<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-upperMobileSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4 sm:top-upperSecondaryStickyFold"
    >
      <label class="truncate font-semibold text-secondaryLight">
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
          :class="{ '!text-accent': WRAP_LINES }"
          :icon="IconWrapText"
          @click.prevent="toggleNestedSetting('WRAP_LINES', 'httpTest')"
        />
        <HoppButtonSecondary
          v-if="shouldEnableAIFeatures && currentRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('ai_experiments.modify_with_ai')"
          :icon="IconSparkles"
          @click="showModifyTestScriptModal"
        />
      </div>
    </div>
    <div class="flex flex-1 border-b border-dividerLight">
      <div class="w-2/3 border-r border-dividerLight h-full relative">
        <MonacoScriptEditor
          v-if="EXPERIMENTAL_SCRIPTING_SANDBOX && props.isActive"
          v-model="testScript"
          :is-active="props.isActive"
          type="post-request"
        />

        <div
          v-else
          ref="testScriptEditor"
          class="h-full absolute inset-0"
        ></div>
      </div>
      <div
        class="z-[9] sticky top-upperTertiaryStickyFold h-full min-w-[12rem] max-w-1/3 flex-shrink-0 overflow-auto overflow-x-auto bg-primary p-4"
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
    <AiexperimentsModifyTestScriptModal
      v-if="isModifyTestScriptModalOpen && currentRequest"
      :current-script="testScript"
      :request-info="currentRequest"
      @close-modal="isModifyTestScriptModalOpen = false"
      @update-script="(updatedScript) => (testScript = updatedScript)"
    />
  </div>
</template>

<script setup lang="ts">
import AiexperimentsModifyTestScriptModal from "@components/aiexperiments/ModifyTestScriptModal.vue"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useVModel } from "@vueuse/core"
import { useService } from "dioc/vue"
import { computed, reactive, ref } from "vue"
import { useAIExperiments } from "~/composables/ai-experiments"
import { useNestedSetting, useSetting } from "~/composables/settings"
import { useReadonlyStream } from "~/composables/stream"
import { invokeAction } from "~/helpers/actions"
import completer from "~/helpers/editor/completion/testScript"
import linter from "~/helpers/editor/linting/testScript"
import testSnippets from "~/helpers/testSnippets"
import { toggleNestedSetting } from "~/newstore/settings"
import { platform } from "~/platform"
import { RESTTabService } from "~/services/tab/rest"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconSparkles from "~icons/lucide/sparkles"
import IconTrash2 from "~icons/lucide/trash-2"
import IconWrapText from "~icons/lucide/wrap-text"

const t = useI18n()

const props = defineProps<{
  modelValue: string
  isActive?: boolean
}>()
const emit = defineEmits(["update:modelValue"])
const testScript = useVModel(props, "modelValue", emit)
const testScriptEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "httpTest")

useCodemirror(
  testScriptEditor,
  testScript,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      lineWrapping: WRAP_LINES,
      placeholder: `${t("test.javascript_code")}`,
    },
    linter,
    completer,
    environmentHighlights: false,
    contextMenuEnabled: false,
  })
)

const EXPERIMENTAL_SCRIPTING_SANDBOX = useSetting(
  "EXPERIMENTAL_SCRIPTING_SANDBOX"
)

const useSnippet = (script: string) => {
  testScript.value += script
}

const clearContent = () => {
  testScript.value = ""
}
const tabService = useService(RESTTabService)

const currentRequest = computed(() =>
  tabService.currentActiveTab.value?.document.type === "request"
    ? tabService.currentActiveTab.value?.document.request
    : null
)

const { shouldEnableAIFeatures } = useAIExperiments()
const isModifyTestScriptModalOpen = ref(false)

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const showModifyTestScriptModal = () => {
  if (!currentUser.value) {
    invokeAction("modals.login.toggle")
    return
  }
  isModifyTestScriptModalOpen.value = true
}
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}
</style>
