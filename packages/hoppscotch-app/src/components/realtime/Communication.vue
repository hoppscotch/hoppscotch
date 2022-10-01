<template>
  <div class="flex flex-col flex-1">
    <div v-if="showEventField" class="flex items-center justify-between p-4">
      <input
        id="event_name"
        v-model="eventName"
        class="input"
        name="event_name"
        :placeholder="`${t('socketio.event_name')}`"
        type="text"
        autocomplete="off"
      />
    </div>
    <div
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperSecondaryStickyFold"
    >
      <span class="flex items-center">
        <label class="font-semibold text-secondaryLight">
          {{ t("websocket.message") }}
        </label>
        <tippy
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions.focus()"
        >
          <span class="select-wrapper">
            <ButtonSecondary
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
              <SmartItem
                v-for="(contentTypeItem, index) in validContentTypes"
                :key="`contentTypeItem-${index}`"
                :label="contentTypeItem"
                :info-icon="contentTypeItem === contentType ? IconDone : null"
                :active-info-icon="contentTypeItem === contentType"
                @click="
                  () => {
                    contentType = contentTypeItem
                    hide()
                  }
                "
              />
            </div>
          </template>
        </tippy>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t('action.send')}`"
          :label="`${t('action.send')}`"
          :disabled="!communicationBody || !isConnected"
          :icon="IconSend"
          class="rounded-none !text-accent !hover:text-accentDark"
          @click="sendMessage()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="t('app.wiki')"
          :icon="IconHelpCircle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          :icon="IconWrapText"
          @click.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          :icon="IconTrash2"
          @click="clearContent"
        />
        <ButtonSecondary
          v-if="contentType && contentType == 'JSON'"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :icon="prettifyIcon"
          @click="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
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
import { Component, computed, reactive, ref } from "vue"
import IconSend from "~icons/lucide/send"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconWrapText from "~icons/lucide/wrap-text"
import IconTrash2 from "~icons/lucide/trash-2"
import IconWand from "~icons/lucide/wand"
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

defineProps({
  showEventField: {
    type: Boolean,
    default: false,
  },
  isConnected: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (
    e: "send-message",
    body: {
      eventName: string
      message: string
    }
  ): void
}>()

const t = useI18n()
const toast = useToast()

// Template refs
const tippyActions = ref<any | null>(null)
const linewrapEnabled = ref(true)
const wsCommunicationBody = ref<HTMLElement>()
const payload = ref<HTMLInputElement>()

const prettifyIcon = refAutoReset<Component>(IconWand, 1000)

const knownContentTypes = {
  JSON: "application/ld+json",
  Raw: "text/plain",
} as const

const validContentTypes = Object.keys(knownContentTypes) as ["JSON", "Raw"]

const contentType = ref<keyof typeof knownContentTypes>("JSON")
const eventName = ref("")
const communicationBody = ref("")

const rawInputEditorLang = computed(() => knownContentTypes[contentType.value])
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

const clearContent = () => {
  communicationBody.value = ""
}

const sendMessage = () => {
  if (!communicationBody.value) return

  emit("send-message", {
    eventName: eventName.value,
    message: communicationBody.value,
  })
  communicationBody.value = ""
}

const uploadPayload = async (e: InputEvent) => {
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
    prettifyIcon.value = IconCheck
  } catch (e) {
    console.error(e)
    prettifyIcon.value = IconInfo
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
}
</script>
