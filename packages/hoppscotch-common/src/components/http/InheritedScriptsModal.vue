<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('script.inherited_scripts')"
    styles="sm:max-w-3xl"
    full-width-body
    @close="emit('close')"
  >
    <template #body>
      <div class="flex h-[24rem]">
        <div
          class="flex w-52 flex-shrink-0 flex-col border-r border-dividerLight overflow-auto bg-primary"
        >
          <button
            v-for="script in scripts"
            :key="script.parentID"
            class="group flex items-center gap-2 px-3 py-2.5 text-left text-tiny transition"
            :class="
              isSelected(script.parentID)
                ? 'bg-primaryLight text-secondaryDark'
                : 'text-secondaryLight hover:bg-primaryLight/50 hover:text-secondary'
            "
            @click="selectedScriptID = script.parentID"
          >
            <icon-lucide-folder
              class="svg-icons !w-3.5 !h-3.5 flex-shrink-0"
              :class="
                isSelected(script.parentID)
                  ? 'text-secondaryDark'
                  : 'text-secondaryLight opacity-50 group-hover:opacity-75'
              "
              aria-hidden="true"
            />
            <span class="flex-1 truncate font-bold">
              {{ script.parentName }}
            </span>
          </button>
        </div>
        <div class="relative flex flex-1 flex-col overflow-hidden">
          <HoppButtonSecondary
            v-if="selectedScript"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copyIcon"
            class="!absolute right-2 top-2 z-10"
            @click="copyScriptContent(displayedScript)"
          />
          <div ref="scriptEditor" class="flex-1 overflow-auto"></div>
        </div>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { useNestedSetting } from "~/composables/settings"
import { refAutoReset } from "@vueuse/core"
import { computed, reactive, ref, watch } from "vue"
import { stripModulePrefix } from "~/helpers/scripting"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"

type InheritedScript = {
  parentID: string
  parentName: string
  preRequestScript: string
  testScript: string
}

const props = defineProps<{
  show: boolean
  scripts: InheritedScript[]
  scriptType: "preRequestScript" | "testScript"
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const t = useI18n()

const selectedScriptID = ref<string | null>(null)

// Reset selection when modal reopens to avoid stale state
watch(
  () => props.show,
  (isVisible) => {
    if (isVisible) {
      selectedScriptID.value = null
    }
  }
)

const isSelected = (id: string) =>
  selectedScriptID.value === id ||
  (selectedScriptID.value === null && props.scripts[0]?.parentID === id)

const selectedScript = computed(
  () =>
    props.scripts.find((s) => s.parentID === selectedScriptID.value) ??
    props.scripts[0] ??
    null
)

const displayedScript = computed(() =>
  selectedScript.value
    ? stripModulePrefix(selectedScript.value[props.scriptType])
    : ""
)

const scriptEditor = ref<any | null>(null)
const WRAP_LINES = useNestedSetting(
  "WRAP_LINES",
  props.scriptType === "preRequestScript" ? "httpPreRequest" : "httpTest"
)

useCodemirror(
  scriptEditor,
  displayedScript,
  reactive({
    extendedEditorConfig: {
      mode: "application/javascript",
      readOnly: true,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyScriptContent = (script: string) => {
  copyToClipboard(script)
  copyIcon.value = IconCheck
}
</script>
