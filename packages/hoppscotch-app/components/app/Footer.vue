<template>
  <div>
    <div class="flex justify-between">
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="EXPAND_NAVIGATION ? $t('hide.sidebar') : $t('show.sidebar')"
          svg="sidebar"
          class="transform"
          :class="{ '-rotate-180': !EXPAND_NAVIGATION }"
          @click.native="EXPAND_NAVIGATION = !EXPAND_NAVIGATION"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${
            ZEN_MODE ? $t('action.turn_off') : $t('action.turn_on')
          } ${$t('layout.zen_mode')}`"
          :svg="ZEN_MODE ? 'minimize' : 'maximize'"
          :class="{
            '!text-accent !focus-visible:text-accentDark !hover:text-accentDark':
              ZEN_MODE,
          }"
          @click.native="ZEN_MODE = !ZEN_MODE"
        />
      </div>
      <div class="flex">
        <span>
          <tippy
            ref="options"
            interactive
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <ButtonSecondary
                svg="help-circle"
                class="!rounded-none"
                :label="`${$t('app.help')}`"
              />
            </template>
            <div class="flex flex-col">
              <SmartItem
                svg="book"
                :label="`${$t('app.documentation')}`"
                to="https://docs.hoppscotch.io"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                svg="zap"
                :label="`${$t('app.keyboard_shortcuts')}`"
                @click.native="
                  () => {
                    showShortcuts = true
                    $refs.options.tippy().hide()
                  }
                "
              />
              <SmartItem
                svg="gift"
                :label="`${$t('app.whats_new')}`"
                to="https://docs.hoppscotch.io/changelog"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                svg="message-circle"
                :label="`${$t('app.chat_with_us')}`"
                @click.native="
                  () => {
                    chatWithUs()
                    $refs.options.tippy().hide()
                  }
                "
              />
              <hr />
              <SmartItem
                svg="github"
                :label="`${$t('app.github')}`"
                to="https://github.com/hoppscotch/hoppscotch"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                svg="twitter"
                :label="`${$t('app.twitter')}`"
                to="https://hoppscotch.io/twitter"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                svg="user-plus"
                :label="`${$t('app.invite')}`"
                @click.native="
                  () => {
                    showShare = true
                    $refs.options.tippy().hide()
                  }
                "
              />
              <SmartItem
                svg="lock"
                :label="`${$t('app.terms_and_privacy')}`"
                to="https://docs.hoppscotch.io/privacy"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <!-- <SmartItem :label="$t('app.status')" /> -->
              <div class="flex opacity-50 py-2 px-4">
                {{ `${$t("app.name")} ${$t("app.version")}` }}
              </div>
            </div>
          </tippy>
        </span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          svg="zap"
          :title="$t('app.shortcuts')"
          @click.native="showShortcuts = true"
        />
        <ButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          svg="share-2"
          :title="$t('request.share')"
          @click.native="nativeShare()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="COLUMN_LAYOUT ? $t('layout.row') : $t('layout.column')"
          svg="columns"
          class="transform"
          :class="{ 'rotate-90': !COLUMN_LAYOUT }"
          @click.native="COLUMN_LAYOUT = !COLUMN_LAYOUT"
        />
        <span
          class="transform transition"
          :class="{
            'rotate-180': SIDEBAR_ON_LEFT,
          }"
        >
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="SIDEBAR ? $t('hide.sidebar') : $t('show.sidebar')"
            svg="sidebar-open"
            class="transform"
            :class="{ 'rotate-180': !SIDEBAR }"
            @click.native="SIDEBAR = !SIDEBAR"
          />
        </span>
      </div>
    </div>
    <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
    <AppShare :show="showShare" @hide-modal="showShare = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "~/helpers/support"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    const showShortcuts = ref(false)
    const showShare = ref(false)

    defineActionHandler("flyouts.keybinds.toggle", () => {
      showShortcuts.value = !showShortcuts.value
    })

    defineActionHandler("modals.share.toggle", () => {
      showShare.value = !showShare.value
    })

    return {
      EXPAND_NAVIGATION: useSetting("EXPAND_NAVIGATION"),
      SIDEBAR: useSetting("SIDEBAR"),
      ZEN_MODE: useSetting("ZEN_MODE"),
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      SIDEBAR_ON_LEFT: useSetting("SIDEBAR_ON_LEFT"),

      navigatorShare: !!navigator.share,

      showShortcuts,
      showShare,
    }
  },
  watch: {
    ZEN_MODE() {
      this.EXPAND_NAVIGATION = !this.ZEN_MODE
    },
  },
  methods: {
    nativeShare() {
      if (navigator.share) {
        navigator
          .share({
            title: "Hoppscotch",
            text: "Hoppscotch • Open source API development ecosystem - Helps you create requests faster, saving precious time on development.",
            url: "https://hoppscotch.io",
          })
          .then(() => {})
          .catch(console.error)
      } else {
        // fallback
      }
    },
    chatWithUs() {
      showChat()
    },
  },
})
</script>
