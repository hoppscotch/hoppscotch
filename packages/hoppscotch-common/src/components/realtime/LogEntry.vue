<template>
  <div v-if="entry" class="divide-y divide-dividerLight">
    <div :style="{ color: entryColor }" class="realtime-log">
      <div class="flex group">
        <div class="flex flex-1 divide-x divide-dividerLight">
          <div class="inline-flex items-center p-2">
            <component
              :is="icon"
              :style="{ color: iconColor }"
              @click="copyQuery(entry.payload)"
            />
          </div>
          <div
            v-if="entry.ts !== undefined"
            class="items-center hidden px-1 w-34 sm:inline-flex"
          >
            <span
              v-tippy="{ theme: 'tooltip' }"
              :title="relativeTime"
              class="mx-auto truncate ts-font text-secondaryLight hover:text-secondary hover:text-center"
            >
              {{ shortDateTime(entry.ts) }}
            </span>
          </div>
          <div
            class="inline-grid items-center flex-1 min-w-0 p-2"
            @click="toggleExpandPayload()"
          >
            <div class="truncate">
              <span v-if="entry.prefix !== undefined" class="!inline">{{
                entry.prefix
              }}</span>
              {{ entry.payload }}
            </div>
          </div>
        </div>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.copy')"
          :icon="copyQueryIcon"
          class="hidden group-hover:inline-flex"
          @click="copyQuery(entry.payload)"
        />
        <HoppButtonSecondary
          :icon="IconChevronDown"
          class="transform"
          :class="{ 'rotate-180': !minimized }"
          @click="toggleExpandPayload()"
        />
      </div>
    </div>
    <div v-if="!minimized" class="overflow-hidden bg-primaryContrast">
      <HoppSmartTabs
        v-model="selectedTab"
        styles="bg-primaryLight"
        render-inactive-tabs
      >
        <HoppSmartTab v-if="isJSON(entry.payload)" id="json" label="JSON" />
        <HoppSmartTab id="raw" label="Raw" />
      </HoppSmartTabs>
      <div
        class="z-10 flex items-center justify-between pl-4 border-b border-dividerLight top-lowerSecondaryStickyFold"
      >
        <label class="font-semibold truncate text-secondaryLight">
          {{ t("response.body") }}
        </label>
        <div class="flex">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': linewrapEnabled }"
            :icon="IconWrapText"
            @click.prevent="linewrapEnabled = !linewrapEnabled"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :icon="downloadIcon"
            @click="downloadResponse"
          />
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :icon="copyIcon"
            @click="copyResponse"
          />
        </div>
      </div>
      <div ref="editor"></div>
      <div
        v-if="outlinePath && selectedTab === 'json'"
        class="sticky bottom-0 z-10 flex flex-shrink-0 px-2 overflow-auto overflow-x-auto border-t bg-primaryLight border-dividerLight flex-nowrap"
      >
        <div
          v-for="(item, index) in outlinePath"
          :key="`item-${index}`"
          class="flex items-center"
        >
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => tippyActions.focus()"
          >
            <div v-if="item.kind === 'RootObject'" class="outline-item">{}</div>
            <div v-if="item.kind === 'RootArray'" class="outline-item">[]</div>
            <div v-if="item.kind === 'ArrayMember'" class="outline-item">
              {{ item.index }}
            </div>
            <div v-if="item.kind === 'ObjectMember'" class="outline-item">
              {{ item.name }}
            </div>
            <template #content="{ hide }">
              <div
                v-if="
                  item.kind === 'ArrayMember' || item.kind === 'ObjectMember'
                "
              >
                <div
                  v-if="item.kind === 'ArrayMember'"
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    v-for="(arrayMember, astIndex) in item.astParent.values"
                    :key="`ast-${astIndex}`"
                    :label="`${astIndex}`"
                    @click="
                      () => {
                        jumpCursor(arrayMember)
                        hide()
                      }
                    "
                  />
                </div>
                <div
                  v-if="item.kind === 'ObjectMember'"
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.escape="hide()"
                >
                  <HoppSmartItem
                    v-for="(objectMember, astIndex) in item.astParent.members"
                    :key="`ast-${astIndex}`"
                    :label="objectMember.key.value"
                    @click="
                      () => {
                        jumpCursor(objectMember)
                        hide()
                      }
                    "
                  />
                </div>
              </div>
              <div
                v-if="item.kind === 'RootObject'"
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
              >
                <HoppSmartItem
                  label="{}"
                  @click="
                    () => {
                      jumpCursor(item.astValue)
                      hide()
                    }
                  "
                />
              </div>
              <div
                v-if="item.kind === 'RootArray'"
                ref="tippyActions"
                class="flex flex-col focus:outline-none"
              >
                <HoppSmartItem
                  label="[]"
                  @click="
                    () => {
                      jumpCursor(item.astValue)
                      hide()
                    }
                  "
                />
              </div>
            </template>
          </tippy>
          <icon-lucide-chevron-right
            v-if="index + 1 !== outlinePath.length"
            class="opacity-50 text-secondaryLight svg-icons"
          />
        </div>
      </div>
    </div>
  </div>
  <div v-else>{{ t("response.waiting_for_connection") }}</div>
</template>

<script setup lang="ts">
import IconInfo from "~icons/lucide/info"
import IconUpRight from "~icons/lucide/arrow-up-right"
import IconDownLeft from "~icons/lucide/arrow-down-left"
import IconCopy from "~icons/lucide/copy"
import IconCheck from "~icons/lucide/check"
import IconChevronDown from "~icons/lucide/chevron-down"
import IconWrapText from "~icons/lucide/wrap-text"
import * as LJSON from "lossless-json"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { ref, computed, reactive, watch, markRaw, PropType } from "vue"
import { refAutoReset, useTimeAgo } from "@vueuse/core"
import { LogEntryData } from "./Log.vue"
import { useI18n } from "@composables/i18n"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { isJSON } from "~/helpers/functional/json"
import { useCopyResponse, useDownloadResponse } from "@composables/lens-actions"
import { useCodemirror } from "@composables/codemirror"
import jsonParse, { JSONObjectMember, JSONValue } from "~/helpers/jsonParse"
import { getJSONOutlineAtPos } from "~/helpers/newOutline"
import {
  convertIndexToLineCh,
  convertLineChToIndex,
} from "~/helpers/editor/utils"
import { shortDateTime } from "~/helpers/utils/date"

const t = useI18n()

const props = defineProps({
  entry: {
    type: Object as PropType<LogEntryData>,
    required: true,
  },
  isOpen: {
    type: Boolean,
    default: false,
  },
})

// Template refs
const tippyActions = ref<any | null>(null)
const editor = ref<any | null>(null)
const linewrapEnabled = ref(true)

const logPayload = computed(() => props.entry.payload)

const selectedTab = ref<"json" | "raw">(
  isJSON(props.entry.payload) ? "json" : "raw"
)

// CodeMirror Implementation
const jsonBodyText = computed(() =>
  pipe(
    logPayload.value,
    O.tryCatchK(LJSON.parse),
    O.map((val) => LJSON.stringify(val, undefined, 2)),
    O.getOrElse(() => logPayload.value)
  )
)

const ast = computed(() =>
  pipe(
    jsonBodyText.value,
    O.tryCatchK(jsonParse),
    O.getOrElseW(() => null)
  )
)

const editorText = computed(() => {
  if (selectedTab.value === "json") return jsonBodyText.value
  else return logPayload.value
})

const editorMode = computed(() => {
  if (selectedTab.value === "json") return "application/ld+json"
  else return "text/plain"
})

const { cursor } = useCodemirror(
  editor,
  editorText,
  reactive({
    extendedEditorConfig: {
      mode: editorMode,
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const jumpCursor = (ast: JSONValue | JSONObjectMember) => {
  const pos = convertIndexToLineCh(jsonBodyText.value, ast.start)
  pos.line--
  cursor.value = pos
}

const outlinePath = computed(() =>
  pipe(
    ast.value,
    O.fromNullable,
    O.map((ast) =>
      getJSONOutlineAtPos(
        ast,
        convertLineChToIndex(jsonBodyText.value, cursor.value)
      )
    ),
    O.getOrElseW(() => null)
  )
)

// Code for UI Changes
const minimized = ref(props.isOpen ? false : true)
watch(minimized, () => {
  selectedTab.value = isJSON(props.entry.payload) ? "json" : "raw"
})

const toggleExpandPayload = () => {
  minimized.value = !minimized.value
}

const { copyIcon, copyResponse } = useCopyResponse(logPayload)

const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  logPayload
)

const copyQueryIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const copyQuery = (entry: string) => {
  copyToClipboard(entry)
  copyQueryIcon.value = IconCheck
}

// Relative Time
// TS could be undefined here. We're just assigning a default value to 0 because we're not showing it in the UI
const relativeTime = useTimeAgo(computed(() => props.entry.ts ?? 0))

const ENTRY_COLORS = {
  connected: "#10b981",
  connecting: "#10b981",
  error: "#ff5555",
  disconnected: "#ff5555",
} as const

// Assigns color based on entry event
const entryColor = computed(
  () => props.entry.event && ENTRY_COLORS[props.entry.event]
)

const ICONS = {
  info: {
    icon: IconInfo,
    iconColor: "#10b981",
  },
  client: {
    icon: IconUpRight,
    iconColor: "#eaaa45",
  },
  server: {
    icon: IconDownLeft,
    iconColor: "#38d4ea",
  },
  disconnected: {
    icon: IconInfo,
    iconColor: "#ff5555",
  },
} as const

const iconColor = computed(() => ICONS[props.entry.source].iconColor)
const icon = computed(() => markRaw(ICONS[props.entry.source].icon))
</script>

<style lang="scss" scoped>
.realtime-log {
  @apply text-secondary;
  @apply overflow-hidden;
  @apply hover:cursor-nsResize;

  &,
  span {
    @apply select-text;
  }

  span {
    @apply block;
    @apply break-words break-all;
  }
}

.outline-item {
  @apply cursor-pointer;
  @apply flex-grow-0 flex-shrink-0;
  @apply text-secondaryLight;
  @apply inline-flex;
  @apply items-center;
  @apply px-2;
  @apply py-1;
  @apply transition;
  @apply hover: text-secondary;
}

.ts-font {
  font-size: 0.6rem;
}
</style>
