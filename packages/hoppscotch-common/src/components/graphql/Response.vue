<template>
  <div class="flex flex-1 flex-col overflow-auto whitespace-nowrap">
    <div
      v-if="
        response && response.length === 1 && response[0].type === 'response'
      "
      class="flex flex-1 flex-col"
    >
      <div
        class="sticky top-0 z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      >
        <label class="truncate font-semibold text-secondaryLight">
          {{ t("response.title") }}
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
            :title="`${t(
              'action.download_file'
            )} <kbd>${getSpecialKey()}</kbd><kbd>J</kbd>`"
            :icon="downloadIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip', allowHTML: true }"
            :title="`${t(
              'action.copy'
            )} <kbd>${getSpecialKey()}</kbd><kbd>.</kbd>`"
            :icon="copyIcon"
            @click="copyResponse"
          />
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => copyInterfaceTippyActions.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('app.copy_interface_type')"
              :icon="IconMore"
            />
            <template #content="{ hide }">
              <div
                ref="copyInterfaceTippyActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
              >
                <HoppSmartItem
                  v-for="(language, index) in interfaceLanguages"
                  :key="index"
                  :label="language"
                  :icon="
                    copiedInterfaceLanguage === language
                      ? copyInterfaceIcon
                      : IconCopy
                  "
                  @click="runCopyInterface(language)"
                />
              </div>
            </template>
          </tippy>
        </div>
      </div>
      <div ref="schemaEditor" class="flex flex-1 flex-col"></div>
    </div>
    <component
      :is="response[0].error.component"
      v-else-if="
        response && response[0].type === 'error' && response[0].error.component
      "
      class="flex-1"
    />
    <div
      v-else-if="response && response?.length > 1"
      class="flex flex-1 flex-col"
    >
      <GraphqlSubscriptionLog :log="response" />
    </div>
    <AppShortcutsPrompt v-else class="p-4" />
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconCopy from "~icons/lucide/copy"
import IconMore from "~icons/lucide/more-horizontal"
import { computed, reactive, ref } from "vue"
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { GQLResponseEvent } from "~/helpers/graphql/connection"
import interfaceLanguages from "~/helpers/utils/interfaceLanguages"
import {
  useCopyInterface,
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"

const t = useI18n()

const props = withDefaults(
  defineProps<{
    response: GQLResponseEvent[] | null
  }>(),
  {
    response: null,
  }
)

const responseString = computed(() => {
  const response = props.response
  if (response && response[0].type === "error") {
    return ""
  } else if (
    response &&
    response.length === 1 &&
    response[0].type === "response" &&
    response[0].data
  ) {
    return JSON.stringify(JSON.parse(response[0].data), null, 2)
  }
  return ""
})

const schemaEditor = ref<any | null>(null)
const copyInterfaceTippyActions = ref<any | null>(null)
const linewrapEnabled = ref(true)

useCodemirror(
  schemaEditor,
  responseString,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const { copyIcon, copyResponse } = useCopyResponse(responseString)
const { copyInterfaceIcon, copyInterface } = useCopyInterface(responseString)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  responseString
)

const copiedInterfaceLanguage = ref("")

const runCopyInterface = (language: string) => {
  copyInterface(language).then(() => {
    copiedInterfaceLanguage.value = language
  })
}

defineActionHandler(
  "response.file.download",
  () => downloadResponse(),
  computed(() => !!props.response && props.response.length > 0)
)
defineActionHandler(
  "response.copy",
  () => copyResponse(),
  computed(() => !!props.response && props.response.length > 0)
)
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-sidebarPrimaryStickyFold #{!important};
}
</style>
