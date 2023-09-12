<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('app.options')"
    styles="sm:max-w-md"
    @close="emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-2">
        <h2 class="p-4 font-semibold font-bold text-secondaryDark">
          {{ t("layout.name") }}
        </h2>
        <HoppSmartItem
          :icon="IconSidebar"
          :label="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          :description="t('layout.collapse_sidebar')"
          :info-icon="IconChevronRight"
          active
          @click="expandNavigation"
        />
        <HoppSmartItem
          :icon="IconSidebarOpen"
          :label="SIDEBAR ? t('hide.collection') : t('show.collection')"
          :description="t('layout.collapse_collection')"
          :info-icon="IconChevronRight"
          active
          @click="expandCollection"
        />
        <h2 class="p-4 font-semibold font-bold text-secondaryDark">
          {{ t("support.title") }}
        </h2>
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
import IconSidebar from "~icons/lucide/sidebar"
import IconSidebarOpen from "~icons/lucide/sidebar-open"
import IconChevronRight from "~icons/lucide/chevron-right"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { platform } from "~/platform"

const t = useI18n()

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const expandNavigation = () => {
  EXPAND_NAVIGATION.value = !EXPAND_NAVIGATION.value
  hideModal()
}

const expandCollection = () => {
  SIDEBAR.value = !SIDEBAR.value
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
