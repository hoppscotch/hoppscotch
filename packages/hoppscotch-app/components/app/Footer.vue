<template>
  <div>
    <div class="flex justify-between bg-primary">
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          svg="sidebar"
          class="transform"
          :class="{ '-rotate-180': !EXPAND_NAVIGATION }"
          @click.native="EXPAND_NAVIGATION = !EXPAND_NAVIGATION"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${ZEN_MODE ? t('action.turn_off') : t('action.turn_on')} ${t(
            'layout.zen_mode'
          )}`"
          :svg="ZEN_MODE ? 'minimize' : 'maximize'"
          :class="{
            '!text-accent !focus-visible:text-accentDark !hover:text-accentDark':
              ZEN_MODE,
          }"
          @click.native="ZEN_MODE = !ZEN_MODE"
        />
        <tippy
          ref="interceptorOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('settings.interceptor')"
              svg="shield-check"
            />
          </template>
          <AppInterceptor />
        </tippy>
      </div>
      <div class="flex">
        <tippy
          ref="options"
          interactive
          trigger="click"
          theme="popover"
          arrow
          :on-shown="() => tippyActions.focus()"
        >
          <template #trigger>
            <ButtonSecondary
              svg="help-circle"
              class="!rounded-none"
              :label="`${t('app.help')}`"
            />
          </template>
          <div
            ref="tippyActions"
            class="flex flex-col focus:outline-none"
            tabindex="0"
            role="menu"
            @keyup.d="documentation.$el.click()"
            @keyup.s="shortcuts.$el.click()"
            @keyup.c="chat.$el.click()"
            @keyup.escape="options.tippy().hide()"
          >
            <SmartItem
              ref="documentation"
              svg="book"
              :label="`${t('app.documentation')}`"
              to="https://docs.hoppscotch.io"
              blank
              :shortcut="['D']"
              @click.native="options.tippy().hide()"
            />
            <SmartItem
              ref="shortcuts"
              svg="zap"
              :label="`${t('app.keyboard_shortcuts')}`"
              :shortcut="['S']"
              @click.native="
                () => {
                  showShortcuts = true
                  options.tippy().hide()
                }
              "
            />
            <SmartItem
              ref="chat"
              svg="message-circle"
              :label="`${t('app.chat_with_us')}`"
              :shortcut="['C']"
              @click.native="
                () => {
                  chatWithUs()
                  options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="gift"
              :label="`${t('app.whats_new')}`"
              to="https://docs.hoppscotch.io/changelog"
              blank
              @click.native="options.tippy().hide()"
            />
            <SmartItem
              svg="activity"
              :label="t('app.status')"
              to="https://status.hoppscotch.io"
              blank
              @click.native="options.tippy().hide()"
            />
            <hr />
            <SmartItem
              svg="github"
              :label="`${t('app.github')}`"
              to="https://github.com/hoppscotch/hoppscotch"
              blank
              @click.native="options.tippy().hide()"
            />
            <SmartItem
              svg="twitter"
              :label="`${t('app.twitter')}`"
              to="https://hoppscotch.io/twitter"
              blank
              @click.native="options.tippy().hide()"
            />
            <SmartItem
              svg="user-plus"
              :label="`${t('app.invite')}`"
              @click.native="
                () => {
                  showShare = true
                  options.tippy().hide()
                }
              "
            />
            <SmartItem
              svg="lock"
              :label="`${t('app.terms_and_privacy')}`"
              to="https://docs.hoppscotch.io/privacy"
              blank
              @click.native="options.tippy().hide()"
            />
            <div
              class="flex px-4 py-2 opacity-50"
              @dblclick="showDeveloperOptionModal()"
            >
              {{ `${t("app.name")} v${$config.clientVersion}` }}
            </div>
          </div>
        </tippy>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          svg="zap"
          :title="t('app.shortcuts')"
          @click.native="showShortcuts = true"
        />
        <ButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          svg="share-2"
          :title="t('request.share')"
          @click.native="nativeShare()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="COLUMN_LAYOUT ? t('layout.row') : t('layout.column')"
          svg="columns"
          class="hidden transform sm:inline"
          :class="{ 'rotate-90': !COLUMN_LAYOUT }"
          @click.native="COLUMN_LAYOUT = !COLUMN_LAYOUT"
        />
        <span
          class="transition transform"
          :class="{
            'rotate-180': SIDEBAR_ON_LEFT,
          }"
        >
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="SIDEBAR ? t('hide.sidebar') : t('show.sidebar')"
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
    <AppPowerSearch :show="showSearch" @hide-modal="showSearch = false" />
    <AppDeveloperOptions
      :show="showDeveloperOptions"
      @hide-modal="showDeveloperOptions = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "@nuxtjs/composition-api"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "~/helpers/support"
import { useSetting } from "~/newstore/settings"
import { useI18n, useReadonlyStream } from "~/helpers/utils/composables"
import { currentUser$ } from "~/helpers/fb/auth"

const t = useI18n()
const showShortcuts = ref(false)
const showShare = ref(false)
const showDeveloperOptions = ref(false)
const showSearch = ref(false)

defineActionHandler("flyouts.keybinds.toggle", () => {
  showShortcuts.value = !showShortcuts.value
})

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
})

defineActionHandler("modals.search.toggle", () => {
  showSearch.value = !showSearch.value
})

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")
const ZEN_MODE = useSetting("ZEN_MODE")
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const navigatorShare = !!navigator.share

const currentUser = useReadonlyStream(currentUser$, null)

watch(
  () => ZEN_MODE.value,
  () => {
    EXPAND_NAVIGATION.value = !ZEN_MODE.value
  }
)

const nativeShare = () => {
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
}

const chatWithUs = () => {
  showChat()
}

const showDeveloperOptionModal = () => {
  if (currentUser.value) {
    showDeveloperOptions.value = true
    options.value.tippy().hide()
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
const documentation = ref<any | null>(null)
const shortcuts = ref<any | null>(null)
const chat = ref<any | null>(null)
const options = ref<any | null>(null)
</script>
