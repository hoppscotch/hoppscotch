<template>
  <Teleport to="body">
    <div class="z-[1000]">
      <Transition name="fade" appear>
        <div
          v-if="show"
          class="fixed inset-0 z-20 transition-opacity"
          @keydown.esc="close()"
        >
          <div
            class="absolute inset-0 bg-primaryLight opacity-90 focus:outline-none"
            tabindex="0"
            @click="close()"
          />
        </div>
      </Transition>
      <Transition name="slide" appear>
        <aside
          v-if="show"
          class="fixed top-0 right-0 z-30 flex flex-col h-full max-w-full overflow-auto border-l shadow-xl border-dividerDark bg-primary"
          :class="{ 'select-none': isResizing }"
          :style="{ width: `${drawerWidth}px` }"
        >
          <div
            class="absolute top-0 left-0 z-40 h-full w-1 cursor-ew-resize transition-colors hover:bg-accent"
            :class="{ 'bg-accent': isResizing }"
            role="separator"
            aria-orientation="vertical"
            :aria-label="t('action.resize')"
            @mousedown.prevent="startResize"
            @touchstart.prevent="startResize"
          />
          <div
            class="flex items-center justify-between p-2 border-b border-dividerLight"
          >
            <h3 class="ml-4 heading">{{ t("response.data_schema") }}</h3>
            <span class="flex items-center">
              <HoppButtonSecondary
                :icon="IconX"
                :title="t('action.close')"
                @click="close()"
              />
            </span>
          </div>
          <div
            v-if="response"
            class="flex flex-col px-4 flex-1 overflow-y-auto"
          >
            <div class="flex flex-col">
              <tippy
                interactive
                trigger="click"
                theme="popover"
                placement="bottom"
                :on-shown="() => tippyActions.focus()"
                class="mt-4"
              >
                <HoppSmartSelectWrapper>
                  <HoppButtonSecondary
                    :label="selectedLanguage"
                    outline
                    class="flex-1 pr-8"
                  />
                </HoppSmartSelectWrapper>
                <template #content="{ hide }">
                  <div class="flex flex-col space-y-2">
                    <div
                      class="sticky top-0 z-10 flex-shrink-0 overflow-x-auto"
                    >
                      <input
                        v-model="searchQuery"
                        type="search"
                        autocomplete="off"
                        class="input flex w-full !bg-primaryContrast p-4 py-2"
                        :placeholder="`${t('action.search')}`"
                      />
                    </div>
                    <div
                      ref="tippyActions"
                      class="flex flex-col focus:outline-none"
                      tabindex="0"
                      @keyup.escape="hide()"
                    >
                      <HoppSmartItem
                        v-for="(lang, key) in filteredResponseInterfaces"
                        :key="lang"
                        :label="key"
                        :info-icon="
                          lang === selectedInterface ? IconCheck : undefined
                        "
                        :active-info-icon="lang === selectedInterface"
                        @click="
                          () => {
                            selectedInterface = lang
                            hide()
                          }
                        "
                      />
                      <HoppSmartPlaceholder
                        v-if="
                          Object.keys(filteredResponseInterfaces).length === 0
                        "
                        :text="`${t('state.nothing_found')} ‟${searchQuery}”`"
                      >
                        <template #icon>
                          <icon-lucide-search class="svg-icons opacity-75" />
                        </template>
                      </HoppSmartPlaceholder>
                    </div>
                  </div>
                </template>
              </tippy>
            </div>
            <div
              v-if="errorState"
              class="my-4 w-full overflow-auto whitespace-normal rounded bg-primaryLight px-4 font-mono text-red-400"
            >
              {{ t("error.something_went_wrong") }}
            </div>
            <div
              v-else-if="selectedInterface"
              class="my-4 rounded border border-dividerLight flex-1 overflow-hidden flex flex-col"
            >
              <div class="flex items-center justify-between pl-4">
                <label class="truncate font-semibold text-secondaryLight">
                  {{ t("request.generated_code") }}
                </label>
                <div class="flex items-center">
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip' }"
                    :title="t('state.linewrap')"
                    :class="{ '!text-accent': WRAP_LINES }"
                    :icon="IconWrapText"
                    @click.prevent="
                      toggleNestedSetting('WRAP_LINES', 'codeGen')
                    "
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip', allowHTML: true }"
                    :title="t('action.download_file')"
                    :icon="downloadIcon"
                    @click="downloadResponse"
                  />
                  <HoppButtonSecondary
                    v-tippy="{ theme: 'tooltip', allowHTML: true }"
                    :title="t('action.copy')"
                    :icon="copyIcon"
                    @click="copyResponse"
                  />
                </div>
              </div>
              <div
                class="h-full relative w-full flex flex-col flex-1 rounded-b border-t border-dividerLight"
              >
                <div ref="generatedCode" class="absolute inset-0"></div>
              </div>
            </div>
          </div>

          <HoppSmartPlaceholder
            v-else
            :src="`/images/states/${colorMode.value}/add_files.svg`"
            :alt="`${t('empty.response')}`"
            :text="`${t('empty.response')}`"
          >
          </HoppSmartPlaceholder>
        </aside>
      </Transition>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { useCodemirror } from "@composables/codemirror"
import { useI18n } from "@composables/i18n"
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from "vue"
import {
  getResponseBodyText,
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"

import { useService } from "dioc/vue"
import { useNestedSetting } from "~/composables/settings"
import {
  interfaceLanguages,
  InterfaceLanguage,
  Language,
} from "~/helpers/utils/interfaceLanguages"
import { toggleNestedSetting } from "~/newstore/settings"
import { PersistenceService } from "~/services/persistence"
import { RESTTabService } from "~/services/tab/rest"
import IconCheck from "~icons/lucide/check"
import IconWrapText from "~icons/lucide/wrap-text"
import IconX from "~icons/lucide/x"
import jsonToLanguage from "~/helpers/utils/json-to-language"
import { GQLTabService } from "~/services/tab/graphql"
import { useColorMode } from "~/composables/theming"

const t = useI18n()
const colorMode = useColorMode()

const props = defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "close"): void
}>()

const restTabs = useService(RESTTabService)
const gqlTabs = useService(GQLTabService)
const persistenceService = useService(PersistenceService)

// Resizable drawer state. Width is persisted across sessions; min/max keep the
// drawer usable on small viewports while allowing wide enough space for code.
const DRAWER_WIDTH_KEY = "response-data-schema-drawer-width"
const DRAWER_DEFAULT_WIDTH = 600
const DRAWER_MIN_WIDTH = 360
const DRAWER_VIEWPORT_PADDING = 80

const drawerWidth = ref(DRAWER_DEFAULT_WIDTH)
const isResizing = ref(false)
let resizeStartX = 0
let resizeStartWidth = 0

const clampWidth = (value: number) => {
  const max = Math.max(
    DRAWER_MIN_WIDTH,
    (typeof window !== "undefined" ? window.innerWidth : value) -
      DRAWER_VIEWPORT_PADDING
  )
  return Math.min(Math.max(value, DRAWER_MIN_WIDTH), max)
}

const getPointerX = (event: MouseEvent | TouchEvent) =>
  "touches" in event ? (event.touches[0]?.clientX ?? 0) : event.clientX

const onResizeMove = (event: MouseEvent | TouchEvent) => {
  if (!isResizing.value) return
  // The touchmove listener uses { passive: false } so we can suppress the
  // browser's native scroll while a touch drag is in progress.
  if ("touches" in event) event.preventDefault()
  // Drawer is anchored to the right edge, so dragging the left handle to the
  // left (decreasing clientX) increases width.
  const delta = resizeStartX - getPointerX(event)
  drawerWidth.value = clampWidth(resizeStartWidth + delta)
}

const stopResize = () => {
  if (!isResizing.value) return
  isResizing.value = false
  window.removeEventListener("mousemove", onResizeMove)
  window.removeEventListener("mouseup", stopResize)
  window.removeEventListener("touchmove", onResizeMove)
  window.removeEventListener("touchend", stopResize)
  window.removeEventListener("touchcancel", stopResize)
  void persistenceService.setLocalConfig(
    DRAWER_WIDTH_KEY,
    String(drawerWidth.value)
  )
}

const startResize = (event: MouseEvent | TouchEvent) => {
  isResizing.value = true
  resizeStartX = getPointerX(event)
  resizeStartWidth = drawerWidth.value
  window.addEventListener("mousemove", onResizeMove)
  window.addEventListener("mouseup", stopResize)
  window.addEventListener("touchmove", onResizeMove, { passive: false })
  window.addEventListener("touchend", stopResize)
  // touchcancel fires when the OS interrupts the gesture (system alert,
  // multi-touch, etc.) — without it, the resize state can get stuck.
  window.addEventListener("touchcancel", stopResize)
}

function getCurrentPageCategory(): "graphql" | "rest" | "other" {
  try {
    const url = new URL(window.location.href)

    if (url.pathname.startsWith("/graphql")) {
      return "graphql"
    } else if (url.pathname === "/") {
      return "rest"
    }
    return "other"
  } catch (_e) {
    return "other"
  }
}

const selectedInterface = ref<InterfaceLanguage>("typescript")
const response = computed(() => {
  let response = ""
  const pageCategory = getCurrentPageCategory()

  if (pageCategory === "rest") {
    const doc = restTabs.currentActiveTab.value.document
    if (doc.type === "request") {
      const res = doc.response
      if (res?.type === "success" || res?.type === "fail") {
        response = getResponseBodyText(res.body)
      }
    } else if (doc.type === "test-runner") {
      const res = doc.request?.response
      if (res?.type === "success" || res?.type === "fail") {
        response = getResponseBodyText(res.body)
      }
    } else {
      const res = doc.response.body
      response = res
    }
  }

  if (pageCategory === "graphql") {
    const res = gqlTabs.currentActiveTab.value.document.response
    if (res && res.length === 1 && res[0].type === "response" && res[0].data) {
      response = JSON.stringify(JSON.parse(res[0].data), null, 2)
    }
  }

  return response
})
const errorState = ref(false)

const interfaceCode = ref("")

const setInterfaceCode = async () => {
  const res = await jsonToLanguage(
    selectedInterface.value,
    response.value || "{}"
  ) // to avoid possible errors empty object is passed
  interfaceCode.value = res.lines.join("\n")
}

watch(selectedInterface, setInterfaceCode)
watch(response, setInterfaceCode, { immediate: true })

const close = () => {
  emit("close")
}

const onKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape" && props.show) close()
}

// Snapshot the prior body overflow so closing/unmounting this drawer cannot
// clobber a scroll lock owned by a different stacked modal.
let prevBodyOverflow: string | null = null
const lockBodyScroll = () => {
  if (typeof document === "undefined" || prevBodyOverflow !== null) return
  prevBodyOverflow = document.body.style.getPropertyValue("overflow")
  document.body.style.setProperty("overflow", "hidden")
}
const restoreBodyScroll = () => {
  if (typeof document === "undefined" || prevBodyOverflow === null) return
  if (prevBodyOverflow)
    document.body.style.setProperty("overflow", prevBodyOverflow)
  else document.body.style.removeProperty("overflow")
  prevBodyOverflow = null
}

watch(
  () => props.show,
  (visible) => {
    if (visible) lockBodyScroll()
    else restoreBodyScroll()
  },
  { immediate: true }
)

onMounted(async () => {
  document.addEventListener("keydown", onKeydown)
  const stored = await persistenceService.getLocalConfig(DRAWER_WIDTH_KEY)
  const parsed = stored ? Number(stored) : NaN
  if (Number.isFinite(parsed)) drawerWidth.value = clampWidth(parsed)
})

onBeforeUnmount(() => {
  document.removeEventListener("keydown", onKeydown)
  stopResize()
  restoreBodyScroll()
})

// Template refs
const tippyActions = ref<any | null>(null)
const generatedCode = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "codeGen")

useCodemirror(
  generatedCode,
  interfaceCode,
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

const searchQuery = ref("")

const filteredResponseInterfaces = computed<
  Record<Language, InterfaceLanguage>
>(() => {
  const searchQueryValue = searchQuery.value.trim()

  return Object.fromEntries(
    Object.entries(interfaceLanguages).filter(([key]) =>
      key.toLowerCase().includes(searchQueryValue)
    )
  ) as Record<Language, InterfaceLanguage>
})

const selectedLanguage = computed<Language>(() => {
  return (
    (Object.keys(interfaceLanguages) as Language[]).find(
      (key) => interfaceLanguages[key] === selectedInterface.value
    ) || "TypeScript"
  )
})

const { copyIcon, copyResponse } = useCopyResponse(interfaceCode)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "",
  interfaceCode,
  t("filename.response_interface")
)
</script>
