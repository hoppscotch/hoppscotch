<template>
  <div class="flex flex-1 flex-col">
    <div
      class="sticky top-lowerSecondaryStickyFold z-10 flex flex-shrink-0 items-center justify-between overflow-x-auto border-b border-dividerLight bg-primary pl-4"
      :class="{ 'py-2': !responseBodyText }"
    >
      <label class="truncate font-semibold text-secondaryLight">
        {{ t("response.body") }}
      </label>
      <div v-if="response.body" class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': WRAP_LINES }"
          :icon="IconWrapText"
          @click.prevent="toggleNestedSetting('WRAP_LINES', 'httpResponseBody')"
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
          v-if="showResponse && !isEditable"
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="
            isSavable
              ? `${t(
                  'action.save_as_example'
                )} <kbd>${getSpecialKey()}</kbd><kbd>E</kbd>`
              : t('response.please_save_request')
          "
          :icon="IconSave"
          :class="{
            'opacity-75 cursor-not-allowed select-none': !isSavable,
          }"
          @click="isSavable ? saveAsExample() : null"
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
          v-if="showResponse && !isEditable"
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => responseMoreActionsTippy?.focus()"
        >
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('action.more')"
            :icon="IconMore"
          />
          <template #content="{ hide }">
            <div
              ref="responseMoreActionsTippy"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-if="!isTestRunner"
                :label="t('action.clear_response')"
                :icon="IconEraser"
                :shortcut="[getSpecialKey(), 'Delete']"
                @click="eraseResponse"
              />
            </div>
          </template>
        </tippy>
      </div>
    </div>
    <div
      ref="containerRef"
      class="h-full relative overflow-auto flex flex-col flex-1"
    >
      <div ref="rawResponse" class="absolute inset-0"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import IconWrapText from "~icons/lucide/wrap-text"
import IconSave from "~icons/lucide/save"
import IconEraser from "~icons/lucide/eraser"
import IconMore from "~icons/lucide/more-horizontal"
import { ref, computed, reactive } from "vue"
import { flow, pipe } from "fp-ts/function"
import * as S from "fp-ts/string"
import * as RNEA from "fp-ts/ReadonlyNonEmptyArray"
import * as A from "fp-ts/Array"
import * as O from "fp-ts/Option"
import { useCodemirror } from "@composables/codemirror"
import { HoppRESTResponse } from "~/helpers/types/HoppRESTResponse"
import { useI18n } from "@composables/i18n"
import {
  useResponseBody,
  useDownloadResponse,
  useCopyResponse,
} from "@composables/lens-actions"
import { objFieldMatches } from "~/helpers/functional/object"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"
import { HoppRESTRequestResponse } from "@hoppscotch/data"
import { useScrollerRef } from "~/composables/useScrollerRef"

const t = useI18n()

const props = defineProps<{
  response:
    | (HoppRESTResponse & { type: "success" | "fail" })
    | HoppRESTRequestResponse
  isEditable: boolean
  isSavable: boolean
  tabId: string
  isTestRunner?: boolean
}>()

const emit = defineEmits<{
  (
    e: "update:response",
    val:
      | (HoppRESTResponse & { type: "success" | "fail" })
      | HoppRESTRequestResponse
  ): void
  (e: "save-as-example"): void
}>()

const { containerRef } = useScrollerRef(
  "RawLens",
  ".cm-scroller",
  undefined, // skip initial scrollTop
  `${props.tabId}::raw` // unique scroll key for RawLens
)

const { responseBodyText } = useResponseBody(props.response)

const isHttpResponse = computed(() => {
  return (
    "type" in props.response &&
    (props.response.type === "success" || props.response.type === "fail")
  )
})

const rawResponseBody = computed(() =>
  isHttpResponse.value ? props.response.body : new ArrayBuffer(0)
)

const showResponse = computed(() => {
  if ("type" in props.response) {
    return props.response.type === "success" || props.response.type === "fail"
  }

  return "body" in props.response
})

const saveAsExample = () => {
  emit("save-as-example")
}

/**
 * Erases the response body.
 * Do not erase if the tab is a saved example or test runner.
 *
 */
const eraseResponse = () => {
  if (!props.isEditable && !props.isTestRunner) emit("update:response", null)
}

const responseType = computed(() =>
  pipe(
    props.response,
    O.fromPredicate(objFieldMatches("type", ["fail", "success"] as const)),
    O.chain(
      // Try getting content-type
      flow(
        (res) => res.headers,
        A.findFirst((h) => h.key.toLowerCase() === "content-type"),
        O.map(flow((h) => h.value, S.split(";"), RNEA.head, S.toLowerCase))
      )
    ),
    O.getOrElse(() => "text/plain")
  )
)

const responseName = computed(() => {
  if ("type" in props.response) {
    if (props.response.type === "success" || props.response.type === "fail") {
      return props.response.req.name
    }
    return "Untitled"
  }

  return props.response.name
})

const { downloadIcon, downloadResponse } = useDownloadResponse(
  responseType.value,
  rawResponseBody,
  t("filename.lens", {
    request_name: responseName.value,
  })
)

const { copyIcon, copyResponse } = useCopyResponse(responseBodyText)

const rawResponse = ref<any | null>(null)
const WRAP_LINES = useNestedSetting("WRAP_LINES", "httpResponseBody")
const responseMoreActionsTippy = ref<HTMLElement | null>(null)

useCodemirror(
  rawResponse,
  responseBodyText,
  reactive({
    extendedEditorConfig: {
      mode: "text/plain",
      readOnly: !props.isEditable,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: true,
    onChange: (update: string) => {
      emit("update:response", {
        ...props.response,
        body: update,
      } as HoppRESTRequestResponse)
    },
  })
)

defineActionHandler("response.file.download", () => downloadResponse())
defineActionHandler("response.copy", () => copyResponse())
defineActionHandler("response.erase", () => eraseResponse())
</script>
