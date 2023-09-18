<template>
  <div
    class="flex flex-col flex-1"
    :class="{ eventFeildShown: showEventField }"
  >
    <div
      v-if="showEventField"
      class="sticky z-10 flex items-center justify-center flex-shrink-0 overflow-x-auto border-b bg-primary border-dividerLight"
      :class="eventFieldStyles"
    >
      <icon-lucide-rss class="mx-4 svg-icons text-accentLight" />
      <input
        id="event_name"
        v-model="eventName"
        class="w-full py-2 pr-4 truncate bg-primary"
        name="event_name"
        :placeholder="`${t('socketio.event_name')}`"
        type="text"
        autocomplete="off"
      />
    </div>
    <div
      class="sticky z-10 flex items-center justify-between flex-shrink-0 pl-4 overflow-x-auto border-b bg-primary border-dividerLight"
      :class="stickyHeaderStyles"
    >
      <span class="flex items-center">
        <label class="font-semibold truncate text-secondaryLight">
          {{ t("websocket.message") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <span class="select-wrapper">
            <HoppButtonSecondary
              :label="contentType || t('state.none').toLowerCase()"
              class="pr-8 ml-2 rounded-none"
            />
          </span>
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                v-for="(contentTypeItem, index) in validRealtimeContentTypes"
                :key="`contentTypeItem-${index}`"
                :label="contentTypeItem"
                :info-icon="
                  contentTypeItem === contentType ? IconDone : undefined
                "
                :active-info-icon="contentTypeItem === contentType"
                @click="
                  () => {
                    contentType = contentTypeItem as ValidRealtimeContentTypes
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t(
            'request.run'
          )} <kbd>${getSpecialKey()}</kbd><kbd>↩</kbd>`"
          :label="`${t('action.send')}`"
          :disabled="!communicationBody || !isConnected"
          :icon="IconSend"
          class="rounded-none !text-accent !hover:text-accentDark"
          @click="sendMessage()"
        />
        <HoppSmartCheckbox
          v-tippy="{ theme: 'tooltip' }"
          :on="clearInputOnSend"
          class="px-2"
          :title="`${t('mqtt.clear_input_on_send')}`"
          @change="clearInputOnSend = !clearInputOnSend"
        >
          {{ t("mqtt.clear_input") }}
        </HoppSmartCheckbox>
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/documentation/features/realtime-api-testing"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent(true)"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <HoppButtonSecondary
          v-if="contentType && contentType == 'JSON'"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :icon="prettifyIcon"
          @click="prettifyRequestBody"
        />
        <label for="payload">
          <HoppButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('import.title')"
            :icon="IconFilePlus"
            @click="payload!.click()"
          />
        </label>
        <input
          ref="payload"
          class="input"
          name="payload"
          type="file"
          @change="uploadPayload"
        />
      </div>
    </div>
    <div ref="wsCommunicationBody" class="flex flex-col flex-1"></div>
  </div>
</template>
<script setup lang="ts">
import { Component, computed, PropType, reactive, ref } from "vue"
import IconSend from "~icons/lucide/send"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import IconTrash2 from "~icons/lucide/trash-2"
import IconWand2 from "~icons/lucide/wand-2"
import IconCheck from "~icons/lucide/check"
import IconInfo from "~icons/lucide/info"
import IconDone from "~icons/lucide/check"
import IconFilePlus from "~icons/lucide/file-plus"
import { pipe } from "fp-ts/function"
import * as TO from "fp-ts/TaskOption"
import * as O from "fp-ts/Option"
import { refAutoReset } from "@vueuse/core"
import { useCodemirror } from "@composables/codemirror"
import jsonLinter from "@helpers/editor/linting/json"
import { readFileAsText } from "@functional/files"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { isJSONContentType } from "@helpers/utils/contenttypes"
import { defineActionHandler } from "~/helpers/actions"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"

import {
  knownRealtimeContentTypes,
  validRealtimeContentTypes,
  ValidRealtimeContentTypes,
} from "@hoppscotch/data"

const props = defineProps({
  showEventField: {
    type: Boolean,
    default: false,
  },
  eventFieldStyles: {
    type: String,
    default: "",
  },
  stickyHeaderStyles: {
    type: String,
    default: "",
  },
  isConnected: {
    type: Boolean,
    default: false,
  },
  contentType: {
    type: String as PropType<ValidRealtimeContentTypes>,
    default: null,
  },
  body: {
    type: String,
    default: undefined,
  },
})

const emit = defineEmits<{
  (
    e: "send-message",
    body: {
      eventName: string
      message: string
      contentType: string
    }
  ): void
  (e: "update:contentType", value: string): void
  (e: "update:body", value: string): void
}>()

// NOTE: Used internally when the v-model contentType property is not specified.
// This allows for making the binding for content type optional, which is useful for
// screens that do not care about the content type but where it would still be beneficial
// for the Communication partial to allow content type selection and linting.
//
// DO NOT MODIFY _internalContentType DIRECTLY. USE contentType INSTEAD!!
const _internalContentType = ref<ValidRealtimeContentTypes>("JSON")
const contentType = computed({
  get() {
    return props.contentType ?? _internalContentType.value
  },
  set(value) {
    emit("update:contentType", (_internalContentType.value = value))
  },
})

// (as above)
const _internalCommunicationBody = ref("")
const communicationBody = computed({
  get() {
    return props.body ?? _internalCommunicationBody.value
  },
  set(value) {
    emit("update:body", (_internalCommunicationBody.value = value))
  },
})

const t = useI18n()
const toast = useToast()

// Template refs
const tippyActions = ref<any | null>(null)
const linewrapEnabled = ref(true)
const wsCommunicationBody = ref<HTMLElement>()
const payload = ref<HTMLInputElement>()

const prettifyIcon = refAutoReset<Component>(IconWand2 as Component, 1000)
const clearInputOnSend = ref(false)

const eventName = ref("")

const rawInputEditorLang = computed(
  () => knownRealtimeContentTypes[contentType.value]
)
const langLinter = computed(() =>
  isJSONContentType(contentType.value) ? jsonLinter : null
)

useCodemirror(
  wsCommunicationBody,
  communicationBody,
  reactive({
    extendedEditorConfig: {
      lineWrapping: linewrapEnabled,
      mode: rawInputEditorLang,
      placeholder: t("websocket.message").toString(),
    },
    linter: langLinter,
    completer: null,
    environmentHighlights: true,
  })
)

const clearContent = (force = false) => {
  if (clearInputOnSend.value || force) {
    communicationBody.value = ""
    eventName.value = ""
  }
}

const sendMessage = () => {
  if (!communicationBody.value) return

  emit("send-message", {
    eventName: eventName.value,
    contentType: contentType.value,
    message: communicationBody.value,
  })
  clearContent()
}

const uploadPayload = async (e: Event) => {
  const result = await pipe(
    (e.target as HTMLInputElement).files?.[0],
    TO.fromNullable,
    TO.chain(readFileAsText)
  )()

  if (O.isSome(result)) {
    communicationBody.value = result.value
    toast.success(`${t("state.file_imported")}`)
  } else {
    toast.error(`${t("action.choose_file")}`)
  }
}
const prettifyRequestBody = () => {
  try {
    const jsonObj = JSON.parse(communicationBody.value)
    communicationBody.value = JSON.stringify(jsonObj, null, 2)
    prettifyIcon.value = IconCheck as Component
  } catch (e) {
    console.error(e)
    prettifyIcon.value = IconInfo as Component
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}

defineActionHandler("request.send-cancel", sendMessage)
</script>

<style lang="scss" scoped>
:deep(.cm-panels) {
  @apply top-upperSecondaryStickyFold #{!important};
}
.eventFeildShown :deep(.cm-panels),
.cmResponsePrimaryStickyFold :deep(.cm-panels) {
  @apply top-upperTertiaryStickyFold #{!important};
}

.cmResponseSecondaryStickyFold :deep(.cm-panels) {
  @apply top-upperFourthStickyFold #{!important};
}
</style>
