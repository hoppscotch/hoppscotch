<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('support.title')"
    styles="sm:max-w-md"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-2">
        <template
          v-for="item in platform.ui?.additionalSupportOptionsMenuItems"
          :key="item.id"
        >
          <HoppSmartItem
            v-if="item.action.type === 'link'"
            :icon="item.icon"
            :label="item.text(t)"
            :to="item.action.href"
            :description="item.subtitle(t)"
            :info-icon="IconChevronRight"
            active
            blank
            @click="hideModal()"
          />
          <HoppSmartItem
            v-else
            :icon="item.icon"
            :label="item.text(t)"
            :description="item.subtitle(t)"
            :info-icon="IconChevronRight"
            active
            @click="
              () => {
                // @ts-expect-error Typescript isn't able to understand
                item.action.do()
                hideModal()
              }
            "
          />
        </template>
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import IconChevronRight from "~icons/lucide/chevron-right"
import { useI18n } from "@composables/i18n"
import { platform } from "~/platform"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const hideModal = () => {
  emit("hide-modal")
}
</script>
