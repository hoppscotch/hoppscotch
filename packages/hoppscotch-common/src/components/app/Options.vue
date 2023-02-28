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
        <HoppSmartItem
          :icon="IconBook"
          :label="t('app.documentation')"
          to="https://docs.hoppscotch.io"
          :description="t('support.documentation')"
          :info-icon="IconChevronRight"
          active
          blank
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconGift"
          :label="t('app.whats_new')"
          to="https://docs.hoppscotch.io/changelog"
          :description="t('support.changelog')"
          :info-icon="IconChevronRight"
          active
          blank
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconActivity"
          :label="t('app.status')"
          to="https://status.hoppscotch.io"
          blank
          :description="t('app.status_description')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconLock"
          :label="`${t('app.terms_and_privacy')}`"
          to="https://docs.hoppscotch.io/privacy"
          blank
          :description="t('app.terms_and_privacy')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <h2 class="p-4 font-semibold font-bold text-secondaryDark">
          {{ t("settings.follow") }}
        </h2>
        <HoppSmartItem
          :icon="IconDiscord"
          :label="t('app.discord')"
          to="https://hoppscotch.io/discord"
          blank
          :description="t('app.join_discord_community')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconTwitter"
          :label="t('app.twitter')"
          to="https://hoppscotch.io/twitter"
          blank
          :description="t('support.twitter')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconGithub"
          :label="`${t('app.github')}`"
          to="https://github.com/hoppscotch/hoppscotch"
          blank
          :description="t('support.github')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconMessageCircle"
          :label="t('app.chat_with_us')"
          :description="t('support.chat')"
          :info-icon="IconChevronRight"
          active
          @click="chatWithUs()"
        />
        <HoppSmartItem
          :icon="IconUserPlus"
          :label="`${t('app.invite')}`"
          :description="t('shortcut.miscellaneous.invite')"
          :info-icon="IconChevronRight"
          active
          @click="expandInvite()"
        />
        <HoppSmartItem
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconShare2"
          :label="`${t('request.share')}`"
          :description="t('request.share_description')"
          :info-icon="IconChevronRight"
          active
          @click="nativeShare()"
        />
      </div>
      <AppShare :show="showShare" @hide-modal="showShare = false" />
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import IconSidebar from "~icons/lucide/sidebar"
import IconSidebarOpen from "~icons/lucide/sidebar-open"
import IconBook from "~icons/lucide/book"
import IconGift from "~icons/lucide/gift"
import IconActivity from "~icons/lucide/activity"
import IconLock from "~icons/lucide/lock"
import IconDiscord from "~icons/brands/discord"
import IconTwitter from "~icons/brands/twitter"
import IconGithub from "~icons/hopp/github"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconUserPlus from "~icons/lucide/user-plus"
import IconShare2 from "~icons/lucide/share-2"
import IconChevronRight from "~icons/lucide/chevron-right"
import { useSetting } from "@composables/settings"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "@modules/crisp"
import { useI18n } from "@composables/i18n"

const t = useI18n()
const navigatorShare = !!navigator.share
const showShare = ref(false)

const ZEN_MODE = useSetting("ZEN_MODE")
const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")

watch(
  () => ZEN_MODE.value,
  () => {
    EXPAND_NAVIGATION.value = !ZEN_MODE.value
  }
)

defineProps<{
  show: boolean
}>()

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
})

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

const expandInvite = () => {
  showShare.value = true
}

const nativeShare = () => {
  if (navigator.share) {
    navigator
      .share({
        title: "Hoppscotch",
        text: "Hoppscotch • Open source API development ecosystem - Helps you create requests faster, saving precious time on development.",
        url: "https://hoppscotch.io",
      })
      .catch(console.error)
  } else {
    // fallback
  }
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
