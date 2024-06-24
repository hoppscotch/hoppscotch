<template>
  <HoppSmartModal
    dialog
    :full-width-body="true"
    title="Environment Properties"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartTabs
        v-model="activeTab"
        styles="sticky overflow-x-auto flex-shrink-0 bg-primary top-0 z-10 !-py-4"
        render-inactive-tabs
      >
        <HoppSmartTab id="details" label="Details">
          <div
            class="flex flex-shrink-0 items-center justify-between border-b border-dividerLight bg-primary pl-4"
          >
            <span>Environment ID</span>

            <!-- TODO: Make it point to the section about accessing environments via the ID -->
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              to="https://docs.hoppscotch.io/documentation/clients/cli"
              blank
              :title="t('app.wiki')"
              :icon="IconHelpCircle"
            />
          </div>

          <div class="p-4">
            <div
              class="flex items-center justify-between py-2 px-4 rounded-md bg-primaryLight"
            >
              <div class="text-secondaryDark">
                {{ environmentID }}
              </div>

              <HoppButtonSecondary
                filled
                :icon="copyTextIcon"
                @click="copyText"
              />
            </div>
          </div>

          <div
            class="bg-bannerInfo px-4 py-2 flex items-center sticky bottom-0"
          >
            <icon-lucide-info class="svg-icons mr-2" />
            This environment ID will be used for CLI collection runner for
            Hoppscotch.
          </div>
        </HoppSmartTab>
      </HoppSmartTabs>
    </template>

    <template #footer>
      <div class="flex gap-x-2 items-center">
        <HoppButtonPrimary
          :label="t('action.copy')"
          :icon="copyIcon"
          outline
          filled
          @click="copyEnvironmentID"
        />
        <HoppButtonSecondary
          :label="t('action.close')"
          outline
          filled
          @click="hideModal"
        />
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { refAutoReset, useVModel } from "@vueuse/core"
import { toRef } from "vue"
import { useCopyResponse } from "~/composables/lens-actions"
import { useToast } from "~/composables/toast"

import { copyToClipboard } from "~/helpers/utils/clipboard"
import IconCheck from "~icons/lucide/check"
import IconCopy from "~icons/lucide/copy"
import IconHelpCircle from "~icons/lucide/help-circle"

const t = useI18n()
const toast = useToast()

const props = defineProps<{
  modelValue: string
  environmentID: string
}>()

const environmentIDRef = toRef(props, "environmentID")

const { copyIcon: copyTextIcon, copyResponse: copyText } =
  useCopyResponse(environmentIDRef)

const emit = defineEmits<{
  (e: "hide-modal"): void
  (e: "update:modelValue"): void
}>()

const activeTab = useVModel(props, "modelValue", emit)

const copyIcon = refAutoReset<typeof IconCopy | typeof IconCheck>(
  IconCopy,
  1000
)

const hideModal = () => {
  emit("hide-modal")
}

const copyEnvironmentID = () => {
  copyToClipboard(props.environmentID)
  copyIcon.value = IconCheck

  toast.success(`${t("state.copied_to_clipboard")}`)
}
</script>
