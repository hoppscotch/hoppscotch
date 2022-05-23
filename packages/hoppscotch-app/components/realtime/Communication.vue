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
      class="sticky z-10 flex items-center justify-between pl-4 border-b bg-primary border-dividerLight top-upperMobileSecondaryStickyFold sm:top-upperSecondaryStickyFold"
    >
      <span class="flex items-center">
        <label class="font-semibold text-secondaryLight">
          {{ $t("websocket.message") }}
        </label>
        <tippy
          ref="contentTypeOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <span class="select-wrapper">
              <ButtonSecondary
                :label="contentType || $t('state.none').toLowerCase()"
                class="pr-8 ml-2 rounded-none"
              />
            </span>
          </template>
          <div class="flex flex-col" role="menu">
            <SmartItem
              v-for="(contentTypeItem, index) in validContentTypes"
              :key="`contentTypeItem-${index}`"
              :label="contentTypeItem"
              :info-icon="contentTypeItem === contentType ? 'done' : ''"
              :active-info-icon="contentTypeItem === contentType"
              @click.native="
                () => {
                  contentType = contentTypeItem
                  $refs.contentTypeOptions.tippy().hide()
                }
              "
            />
          </div>
        </tippy>
      </span>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', delay: [500, 20], allowHTML: true }"
          :title="`${t('action.send')}`"
          :label="`${t('action.send')}`"
          :disabled="!communicationBody || !isConnected"
          svg="send"
          class="rounded-none !text-accent !hover:text-accentDark"
          @click.native="sendMessage()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/body"
          blank
          :title="t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('state.linewrap')"
          :class="{ '!text-accent': linewrapEnabled }"
          svg="wrap-text"
          @click.native.prevent="linewrapEnabled = !linewrapEnabled"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.clear')"
          svg="trash-2"
          @click.native="clearContent"
        />
        <ButtonSecondary
          v-if="contentType && contentType == 'JSON'"
          ref="prettifyRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('action.prettify')"
          :svg="prettifyIcon"
          @click.native="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('import.title')"
            svg="file-plus"
            @click.native="$refs.payload.click()"
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
import { computed, reactive, ref } from "@nuxtjs/composition-api"
import { pipe } from "fp-ts/function"
import * as TO from "fp-ts/TaskOption"
import * as O from "fp-ts/Option"
import { useCodemirror } from "~/helpers/editor/codemirror"
import jsonLinter from "~/helpers/editor/linting/json"
import { readFileAsText } from "~/helpers/functional/files"
import { useI18n, useToast } from "~/helpers/utils/composables"
import { isJSONContentType } from "~/helpers/utils/contenttypes"

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

const linewrapEnabled = ref(true)
const wsCommunicationBody = ref<HTMLElement>()
const prettifyIcon = ref<"wand" | "check" | "info">("wand")

const knownContentTypes = {
  JSON: "application/ld+json",
  Raw: "text/plain",
} as const

const validContentTypes = Object.keys(knownContentTypes)

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
    prettifyIcon.value = "check"
  } catch (e) {
    console.error(e)
    prettifyIcon.value = "info"
    toast.error(`${t("error.json_prettify_invalid_body")}`)
  }
  setTimeout(() => (prettifyIcon.value = "wand"), 1000)
}
</script>
