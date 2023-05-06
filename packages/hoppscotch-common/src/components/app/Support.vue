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
          :icon="IconZap"
          :label="t('app.keyboard_shortcuts')"
          :description="t('support.shortcuts')"
          :info-icon="IconChevronRight"
          active
          @click="showShortcuts()"
        />
        <HoppSmartItem
          :icon="IconGift"
          :label="t('app.whats_new')"
          to="https://docs.hoppscotch.io/documentation/changelog"
          :description="t('support.changelog')"
          :info-icon="IconChevronRight"
          active
          blank
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
          :icon="IconGitHub"
          :label="t('app.github')"
          to="https://hoppscotch.io/github"
          blank
          :description="t('support.github')"
          :info-icon="IconChevronRight"
          active
          @click="hideModal()"
        />
        <HoppSmartItem
          :icon="IconDiscord"
          :label="t('app.join_discord_community')"
          to="https://hoppscotch.io/discord"
          blank
          :description="t('support.community')"
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
      </div>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import IconTwitter from "~icons/brands/twitter"
import IconDiscord from "~icons/brands/discord"
import IconGitHub from "~icons/lucide/github"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconGift from "~icons/lucide/gift"
import IconZap from "~icons/lucide/zap"
import IconBook from "~icons/lucide/book"
import IconChevronRight from "~icons/lucide/chevron-right"
import { invokeAction } from "@helpers/actions"
import { showChat } from "@modules/crisp"
import { useI18n } from "@composables/i18n"

const t = useI18n()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const chatWithUs = () => {
  showChat()
  hideModal()
}

const showShortcuts = () => {
  invokeAction("flyouts.keybinds.toggle")
  hideModal()
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
