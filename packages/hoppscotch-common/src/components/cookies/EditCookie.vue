<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('cookies.modal.set')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <div class="h-46 border rounded border-dividerLight">
        <div
          ref="cookieEditor"
          class="h-full border-t rounded-b border-dividerLight"
        ></div>
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
          class="self-end"
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
import { watch, ref } from "vue"
import { refAutoReset } from "@vueuse/core"
import IconClipboard from "~icons/lucide/clipboard"
import IconCheck from "~icons/lucide/check"
import { useToast } from "~/composables/toast"

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

useCodemirror(cookieEditor, rawCookieString, {
  extendedEditorConfig: {
    mode: "text/plain",
    placeholder: `${t("cookies.modal.cookie_string")}`,
    lineWrapping: true,
  },
  linter: null,
  completer: null,
  environmentHighlights: false,
})

const pasteIcon = refAutoReset<typeof IconClipboard | typeof IconCheck>(
  IconClipboard,
  1000
)

watch(
  () => props.entry,
  () => {
    if (props.entry?.type !== "edit") return

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
</script>
