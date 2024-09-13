<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('cookies.modal.set')"
    @close="hideModal"
  >
    <template #body>
      <div class="rounded border border-dividerLight">
        <div class="flex flex-col">
          <div class="flex items-center justify-between pl-4">
            <label class="truncate font-semibold text-secondaryLight">
              {{ t("cookies.modal.cookie_string") }}
            </label>
            <div class="flex items-center">
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('action.clear_all')"
                :icon="IconTrash2"
                @click="clearContent()"
              />
              <HoppButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                :title="t('state.linewrap')"
                :class="{ '!text-accent': WRAP_LINES }"
                :icon="IconWrapText"
                @click.prevent="toggleNestedSetting('WRAP_LINES', 'cookie')"
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
          <div class="h-46">
            <div
              ref="cookieEditor"
              class="h-full rounded-b border-t border-dividerLight"
            ></div>
          </div>
        </div>
      </div>
    </template>
    <template #footer>
      <div class="flex space-x-2">
        <HoppButtonPrimary
          v-focus
          :label="t('action.save')"
          outline
          @click="saveCookieChange"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelCookieChange"
        />
      </div>
      <span class="flex">
        <HoppButtonSecondary
          :icon="pasteIcon"
          :label="`${t('action.paste')}`"
          filled
          outline
          @click="handlePaste"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script lang="ts">
export type EditCookieConfig =
  | { type: "create"; domain: string }
  | {
      type: "edit"
      domain: string
      entryIndex: number
      currentCookieEntry: string
    }
</script>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useCodemirror } from "~/composables/codemirror"
import { watch, ref, reactive } from "vue"
import { refAutoReset } from "@vueuse/core"
import IconWrapText from "~icons/lucide/wrap-text"
import IconClipboard from "~icons/lucide/clipboard"
import IconCheck from "~icons/lucide/check"
import IconTrash2 from "~icons/lucide/trash-2"
import { useToast } from "~/composables/toast"
import {
  useCopyResponse,
  useDownloadResponse,
} from "~/composables/lens-actions"
import { useNestedSetting } from "~/composables/settings"
import { toggleNestedSetting } from "~/newstore/settings"

// TODO: Build Managed Mode!

const props = defineProps<{
  show: boolean

  entry: EditCookieConfig | null
}>()

const emit = defineEmits<{
  (e: "save-cookie", cookie: string): void
  (e: "hide-modal"): void
}>()

const t = useI18n()

const toast = useToast()

const cookieEditor = ref<HTMLElement>()
const rawCookieString = ref("")
const WRAP_LINES = useNestedSetting("WRAP_LINES", "cookie")

useCodemirror(
  cookieEditor,
  rawCookieString,
  reactive({
    extendedEditorConfig: {
      mode: "text/plain",
      placeholder: `${t("cookies.modal.enter_cookie_string")}`,
      lineWrapping: WRAP_LINES,
    },
    linter: null,
    completer: null,
    environmentHighlights: false,
  })
)

const pasteIcon = refAutoReset<typeof IconClipboard | typeof IconCheck>(
  IconClipboard,
  1000
)

watch(
  () => props.entry,
  () => {
    if (!props.entry) return

    if (props.entry.type === "create") {
      rawCookieString.value = ""
      return
    }

    rawCookieString.value = props.entry.currentCookieEntry
  }
)

function hideModal() {
  emit("hide-modal")
}

function cancelCookieChange() {
  hideModal()
}

async function handlePaste() {
  try {
    const text = await navigator.clipboard.readText()
    if (text) {
      rawCookieString.value = text
      pasteIcon.value = IconCheck
    }
  } catch (e) {
    console.error("Failed to copy: ", e)
    toast.error(t("profile.no_permission").toString())
  }
}

function saveCookieChange() {
  emit("save-cookie", rawCookieString.value)
}

const { copyIcon, copyResponse } = useCopyResponse(rawCookieString)
const { downloadIcon, downloadResponse } = useDownloadResponse(
  "text/plain",
  rawCookieString,
  t("filename.cookie_key_value_pairs")
)

function clearContent() {
  rawCookieString.value = ""
}
</script>
