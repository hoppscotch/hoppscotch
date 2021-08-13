<template>
  <SmartModal
    v-if="show"
    :title="$t('support.title')"
    @close="$emit('hide-modal')"
  >
    <template #body>
      <div class="flex flex-col space-y-2">
        <SmartItem
          icon="menu_book"
          :label="$t('app.documentation')"
          to="https://github.com/hoppscotch/hoppscotch/wiki"
          :description="$t('support.documentation')"
          info-icon="chevron_right"
          active
          blank
          @click.native="hideModal()"
        />
        <SmartItem
          icon="keyboard"
          :label="$t('app.keyboard_shortcuts')"
          :description="$t('support.shortcuts')"
          info-icon="chevron_right"
          active
          @click.native="
            showShortcuts()
            hideModal()
          "
        />
        <SmartItem
          icon="auto_awesome"
          :label="$t('app.whats_new')"
          to="https://github.com/hoppscotch/hoppscotch/blob/main/CHANGELOG.md"
          :description="$t('support.changelog')"
          info-icon="chevron_right"
          active
          blank
          @click.native="hideModal()"
        />
        <SmartItem
          icon="contact_support"
          :label="$t('app.chat_with_us')"
          :description="$t('support.chat')"
          info-icon="chevron_right"
          active
          @click.native="
            chatWithUs()
            hideModal()
          "
        />
        <SmartItem
          svg="discord"
          :label="$t('app.join_discord_community')"
          to="https://hoppscotch.io/discord"
          blank
          :description="$t('support.community')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
        <SmartItem
          svg="twitter"
          :label="$t('app.twitter')"
          to="https://twitter.com/hoppscotch_io"
          blank
          :description="$t('support.twitter')"
          info-icon="chevron_right"
          active
          @click.native="hideModal()"
        />
      </div>
    </template>
  </SmartModal>
</template>

<script>
import { invokeAction } from "~/helpers/actions"
import { showChat } from "~/helpers/support"

export default {
  props: {
    show: Boolean,
  },
  methods: {
    chatWithUs() {
      showChat()
    },
    showShortcuts() {
      invokeAction("flyouts.keybinds.toggle")
    },
    hideModal() {
      this.$emit("hide-modal")
    },
  },
}
</script>
