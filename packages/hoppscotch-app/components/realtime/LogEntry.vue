<template>
  <div v-if="entry">
    <div
      :style="{ color: entryColor }"
      class="realtime-log"
      @mouseover="invertHover()"
      @mouseout="invertHover()"
    >
      <div class="divide-y border-y divide-dividerLight border-dividerLight">
        <div class="flex divide-x divide-dividerLight">
          <div class="inline-flex items-center p-2">
            <SmartIcon
              class="svg-icons"
              :name="`${source(entry.source)}`"
              @click.native="copyQuery(entry.payload)"
            />
          </div>
          <div class="items-center hidden px-1 w-18 sm:inline-flex">
            <span
              ref="timestampEl"
              class="mx-auto truncate ts-font text-secondaryLight hover:text-secondary hover:text-center"
            >
              {{
                timestampHovered
                  ? relativeTime
                  : new Date(entry.ts).toLocaleTimeString()
              }}
            </span>
          </div>
          <div
            class="flex items-center flex-1 min-w-0 p-2"
            @click="toggleExpandPayload()"
          >
            <div class="truncate">
              {{ entry.payload }}
            </div>
          </div>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :svg="`${copyQueryIcon}`"
            @click.native="copyQuery(entry.payload)"
          />
          <ButtonSecondary
            svg="chevron-down"
            class="transform"
            :class="{ 'rotate-180': !minimized }"
            @click.native="toggleExpandPayload()"
          />
        </div>
      </div>
    </div>
    <div v-if="!minimized" class="overflow-hidden">
      <SmartTabs v-model="selectedTab">
        <SmartTab v-if="isJSON(entry.payload)" id="json" label="JSON" />
        <SmartTab id="raw" label="Raw" />
      </SmartTabs>
      <div
        class="z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
      >
        <label class="font-semibold text-secondaryLight">
          {{ t("response.body") }}
        </label>
        <div class="flex">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('state.linewrap')"
            :class="{ '!text-accent': linewrapEnabled }"
            svg="wrap-text"
            @click.native.prevent="linewrapEnabled = !linewrapEnabled"
          />
          <ButtonSecondary
            ref="downloadResponse"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.download_file')"
            :svg="downloadIcon"
            @click.native="downloadResponse"
          />
          <ButtonSecondary
            ref="copyResponse"
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.copy')"
            :svg="copyIcon"
            @click.native="copyResponse"
          />
        </div>
      </div>
      <div ref="editor"></div>
      <div
        v-if="outlinePath && selectedTab === 'json'"
        class="sticky bottom-0 z-10 flex px-2 overflow-auto border-t bg-primaryLight border-dividerLight flex-nowrap hide-scrollbar"
      >
        <div
          v-for="(item, index) in outlinePath"
          :key="`item-${index}`"
          class="flex items-center"
        >
          <tippy
            ref="outlineOptions"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <div v-if="item.kind === 'RootObject'" class="outline-item">
                {}
              </div>
              <div v-if="item.kind === 'RootArray'" class="outline-item">
                []
              </div>
              <div v-if="item.kind === 'ArrayMember'" class="outline-item">
                {{ item.index }}
              </div>
              <div v-if="item.kind === 'ObjectMember'" class="outline-item">
                {{ item.name }}
              </div>
            </template>
            <div
              v-if="item.kind === 'ArrayMember' || item.kind === 'ObjectMember'"
            >
              <div
                v-if="item.kind === 'ArrayMember'"
                class="flex flex-col"
                role="menu"
              >
                <SmartItem
                  v-for="(arrayMember, astIndex) in item.astParent.values"
                  :key="`ast-${astIndex}`"
                  :label="`${astIndex}`"
                  @click.native="
                    () => {
                      jumpCursor(arrayMember)
                      outlineOptions[index].tippy().hide()
                    }
                  "
                />
              </div>
              <div
                v-if="item.kind === 'ObjectMember'"
                class="flex flex-col"
                role="menu"
              >
                <SmartItem
                  v-for="(objectMember, astIndex) in item.astParent.members"
                  :key="`ast-${astIndex}`"
                  :label="objectMember.key.value"
                  @click.native="
                    () => {
                      jumpCursor(objectMember)
                      outlineOptions[index].tippy().hide()
                    }
                  "
                />
              </div>
            </div>
            <div
              v-if="item.kind === 'RootObject'"
              class="flex flex-col"
              role="menu"
            >
              <SmartItem
                label="{}"
                @click.native="
                  () => {
                    jumpCursor(item.astValue)
                    outlineOptions[index].tippy().hide()
                  }
                "
              />
            </div>
            <div
              v-if="item.kind === 'RootArray'"
              class="flex flex-col"
              role="menu"
            >
              <SmartItem
                label="[]"
                @click.native="
                  () => {
                    jumpCursor(item.astValue)
                    outlineOptions[index].tippy().hide()
                  }
                "
              />
            </div>
          </tippy>
          <i
            v-if="index + 1 !== outlinePath.length"
            class="opacity-50 text-secondaryLight material-icons"
          >
            chevron_right
          </i>
        </div>
      </div>
    </div>
  </div>
  <div v-else>{{ t("response.waiting_for_connection") }}</div>
</template>

<script setup lang="ts">
import * as LJSON from "lossless-json"
import * as O from "fp-ts/Option"
import { pipe } from "fp-ts/function"
import { ref, computed, reactive, watch } from "@nuxtjs/composition-api"
import { useElementHover, useTimeAgo } from "@vueuse/core"
import { LogEntryData } from "./Log.vue"
import { useI18n } from "~/helpers/utils/composables"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { isJSON } from "~/helpers/functional/json"
import useCopyResponse from "~/helpers/lenses/composables/useCopyResponse"
import useDownloadResponse from "~/helpers/lenses/composables/useDownloadResponse"
import { useCodemirror } from "~/helpers/editor/codemirror"
import jsonParse, { JSONObjectMember, JSONValue } from "~/helpers/jsonParse"
import { getJSONOutlineAtPos } from "~/helpers/newOutline"
import {
  convertIndexToLineCh,
  convertLineChToIndex,
} from "~/helpers/editor/utils"

const t = useI18n()

const props = defineProps<{ entry: LogEntryData }>()
const outlineOptions = ref<any | null>(null)
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
const minimized = ref(true)
watch(minimized, () => {
  selectedTab.value = isJSON(props.entry.payload) ? "json" : "raw"
})

const hover = ref(false)

const toggleExpandPayload = () => {
  minimized.value = !minimized.value
}

const invertHover = () => {
  hover.value = !hover.value
}

const { copyIcon, copyResponse } = useCopyResponse(logPayload)

const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  logPayload
)

const copyQueryIcon = ref("copy")
const copyQuery = (entry: string) => {
  copyToClipboard(entry)
  copyQueryIcon.value = "check"
  setTimeout(() => (copyQueryIcon.value = "copy"), 1000)
}

// Relative Time
const relativeTime = useTimeAgo(computed(() => props.entry.ts))
const timestampEl = ref()
const timestampHovered = useElementHover(timestampEl)

// Assigns color based on entry event
const entryColor = computed(() => {
  switch (props.entry.event) {
    case "connected":
      return "#10b981"
    case "connecting":
      return "#10b981"
    case "error":
      return "#ff5555"
    case "disconnected":
      return "#ff5555"
  }
})

// Adds relevant icons for each entry source
const sourceIcons = {
  // Source used for info messages.
  info: "info-realtime",
  // Source used for client to server messages.
  client: "arrow-up-right",
  // Source used for server to client messages.
  server: "arrow-down-left",
  // Source used for disconnected messages.
  disconnected: "info-disconnect",
}

const source = (source: keyof typeof sourceIcons) => {
  return sourceIcons[source]
}
</script>

<style scoped lang="scss">
.realtime-log {
  @apply bg-transparent;
  @apply text-secondary;
  @apply overflow-auto;

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
