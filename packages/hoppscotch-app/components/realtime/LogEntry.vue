<template>
  <div v-if="entry">
    <div
      :style="{ color: entryColor }"
      class="font-uniform realtime-log"
      @mouseover="invertHover()"
      @mouseout="invertHover()"
    >
      <div class="border-y divide-y divide-dividerLight border-dividerLight">
        <div class="flex divide-x divide-dividerLight">
          <div class="inline-flex items-center">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :svg="`${source(entry.source)}`"
              @click.native="copyQuery(entry.payload)"
            />
          </div>
          <div class="hidden sm:inline-flex items-center px-1 w-16">
            <span
              ref="timestampEl"
              class="ts-font text-secondaryLight hover:text-secondary mx-auto"
            >
              {{
                timestampHovered
                  ? relativeTime
                  : new Date(entry.ts).toLocaleTimeString()
              }}
            </span>
          </div>

          <div class="flex-1 inline-flex items-center px-1.5 truncate">
            <div @click="toggleExpandPayload()">{{ entry.payload }}</div>
          </div>
          <div :class="expandCopy" class="ml-1 items-center">
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('action.copy')"
              :svg="`${copyQueryIcon}`"
              @click.native="copyQuery(entry.payload)"
            />
          </div>
          <div class="inline-flex items-center">
            <ButtonSecondary
              svg="chevron-down"
              class="transform"
              :class="{ 'rotate-180': !minimized }"
              @click.native="toggleExpandPayload()"
            />
          </div>
        </div>
      </div>
    </div>
    <div v-if="!minimized && isJSON(entry.payload)">
      <div
        class="z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-lowerSecondaryStickyFold"
      >
        <label class="font-semibold text-secondaryLight">{{
          t("response.body")
        }}</label>
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

      <div ref="jsonResponse"></div>
      <div
        v-if="outlinePath"
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
            >chevron_right</i
          >
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
import { ref, computed, reactive } from "@nuxtjs/composition-api"
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
const jsonResponse = ref<any | null>(null)
const linewrapEnabled = ref(true)
const logPayload = computed(() => props.entry.payload)

const jsonBodyText = computed(() =>
  pipe(
    logPayload.value,
    O.tryCatchK(LJSON.parse),
    O.map((val) => LJSON.stringify(val, undefined, 2)),
    O.getOrElse(() => logPayload.value)
  )
)

const { copyIcon, copyResponse } = useCopyResponse(logPayload)

const { downloadIcon, downloadResponse } = useDownloadResponse(
  "application/json",
  logPayload
)

const ast = computed(() =>
  pipe(
    jsonBodyText.value,
    O.tryCatchK(jsonParse),
    O.getOrElseW(() => null)
  )
)

const { cursor } = useCodemirror(
  jsonResponse,
  jsonBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "application/ld+json",
      readOnly: true,
      lineWrapping: linewrapEnabled,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
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

const minimized = ref(true)
const hover = ref(false)

const relativeTime = useTimeAgo(computed(() => props.entry.ts))

const timestampEl = ref()
const timestampHovered = useElementHover(timestampEl)

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

const expandCopy = computed(() => {
  if (hover.value) return "inline-flex"
  return "hidden"
})

const copyQueryIcon = ref("copy")
const copyQuery = (entry: string) => {
  copyToClipboard(entry)
  copyQueryIcon.value = "check"
  setTimeout(() => (copyQueryIcon.value = "copy"), 1000)
}

const toggleExpandPayload = () => {
  minimized.value = !minimized.value
}

const invertHover = () => {
  hover.value = !hover.value
}

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
