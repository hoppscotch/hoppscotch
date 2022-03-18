<template>
  <SmartModal
    v-if="show"
    :title="t('app.options')"
    max-width="sm:max-w-md"
    class="text-sm"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-2">
        <h2 class="font-semibold ml-3 text-lg text-gray-300">
          {{ t("layout.name") }}
        </h2>
        <SmartItem
          svg="sidebar"
          :label="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          :description="t('layout.collapse_sidebar')"
          info-icon="chevron_right"
          active
          @click.native="expandNavigation"
        />

        <SmartItem
          svg="sidebar-open"
          :label="SIDEBAR ? t('hide.collection') : t('show.collection')"
          :description="t('layout.collapse_collection')"
          info-icon="chevron_right"
          active
          @click.native="expandCollection"
        />

        <h2 class="font-semibold ml-3 text-lg text-gray-300">
          {{ t("support.title") }}
        </h2>
        <SmartItem
          svg="book"
          :label="t('app.documentation')"
          to="https://docs.hoppscotch.io"
          :description="t('support.documentation')"
          info-icon="chevron_right"
          active
          blank
          @click.native="hideModal()"
        />

        <SmartItem
          svg="gift"
          :label="t('app.whats_new')"
          to="https://docs.hoppscotch.io/changelog"
          :description="t('support.changelog')"
          info-icon="chevron_right"
          active
          blank
          @click.native="hideModal()"
        />
        <SmartItem
          svg="activity"
          :label="t('app.status')"
          to="https://status.hoppscotch.io"
          blank
          :description="t('app.status_description')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
        <SmartItem
          svg="lock"
          :label="`${t('app.terms_and_privacy')}`"
          to="https://docs.hoppscotch.io/privacy"
          blank
          :description="t('app.terms_and_privacy')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />

        <h2 class="font-semibold ml-3 text-lg text-gray-300">
          {{ t("settings.follow") }}
        </h2>

        <SmartItem
          svg="brands/discord"
          :label="t('app.discord')"
          to="https://hoppscotch.io/discord"
          blank
          :description="t('app.join_discord_community')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
        <SmartItem
          svg="brands/twitter"
          :label="t('app.twitter')"
          to="https://hoppscotch.io/twitter"
          blank
          :description="t('support.twitter')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
        <SmartItem
          svg="github"
          :label="`${t('app.github')}`"
          to="https://github.com/hoppscotch/hoppscotch"
          blank
          :description="t('support.github')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
        <SmartItem
          svg="message-circle"
          :label="t('app.chat_with_us')"
          :description="t('support.chat')"
          info-icon="chevron_right"
          active
          @click.native="chatWithUs()"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import { useSetting } from "~/newstore/settings"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "~/helpers/support"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()
const ZEN_MODE = useSetting("ZEN_MODE")
const showShare = ref(false)
const showSearch = ref(false)

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")

watch(
  () => ZEN_MODE.value,
  () => {
    EXPAND_NAVIGATION.value = !ZEN_MODE.value
  }
)

defineProps<{
  show: Boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const chatWithUs = () => {
  showChat()
  hideModal()
}

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

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
})

defineActionHandler("modals.search.toggle", () => {
  showSearch.value = !showSearch.value
})
</script>
