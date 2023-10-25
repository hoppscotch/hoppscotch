<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('cookies.modal.set')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartInput
        v-model="rawCookieString"
        :placeholder="t('cookies.modal.cookie_string')"
      />
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
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { watch, ref } from "vue"

// TODO: Build Managed Mode!

const props = defineProps<{
  show: boolean

  // Tuple of [domain, entryIndex, cookieEntry]
  entry: [string, number, string] | null
}>()

const emit = defineEmits<{
  (e: "save-cookie", cookie: string): void
  (e: "hide-modal"): void
}>()

const t = useI18n()

const rawCookieString = ref("")

watch(
  () => props.entry,
  () => {
    if (!props.entry) return

    const cookieEntry = props.entry[2]

    rawCookieString.value = cookieEntry
  }
)

function hideModal() {
  emit("hide-modal")
}

function cancelCookieChange() {
  hideModal()
}

function saveCookieChange() {
  emit("save-cookie", rawCookieString.value)
}
</script>
