<template>
  <div>
    <div class="flex justify-between bg-primary">
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          :icon="IconSidebar"
          class="transform"
          :class="{ '-rotate-180': !EXPAND_NAVIGATION }"
          @click="EXPAND_NAVIGATION = !EXPAND_NAVIGATION"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${ZEN_MODE ? t('action.turn_off') : t('action.turn_on')} ${t(
            'layout.zen_mode'
          )}`"
          :icon="ZEN_MODE ? IconMinimize : IconMaximize"
          :class="{
            '!text-accent !focus-visible:text-accentDark !hover:text-accentDark':
              ZEN_MODE,
          }"
          @click="ZEN_MODE = !ZEN_MODE"
        />
        <tippy interactive trigger="click" theme="popover" arrow>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('settings.interceptor')"
            :icon="IconShieldCheck"
          />
          <template #content>
            <AppInterceptor />
          </template>
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
          <ButtonSecondary
            :icon="IconHelpCircle"
            class="!rounded-none"
            :label="`${t('app.help')}`"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              role="menu"
              @keyup.d="documentation.$el.click()"
              @keyup.s="shortcuts.$el.click()"
              @keyup.c="chat.$el.click()"
              @keyup.escape="hide()"
            >
              <SmartItem
                ref="documentation"
                :icon="IconBook"
                :label="`${t('app.documentation')}`"
                to="https://docs.hoppscotch.io"
                blank
                :shortcut="['D']"
                @click="hide()"
              />
              <SmartItem
                ref="shortcuts"
                :icon="IconZap"
                :label="`${t('app.keyboard_shortcuts')}`"
                :shortcut="['S']"
                @click="
                  () => {
                    showShortcuts = true
                    hide()
                  }
                "
              />
              <SmartItem
                ref="chat"
                :icon="IconMessageCircle"
                :label="`${t('app.chat_with_us')}`"
                :shortcut="['C']"
                @click="
                  () => {
                    chatWithUs()
                    hide()
                  }
                "
              />
              <SmartItem
                :icon="IconGift"
                :label="`${t('app.whats_new')}`"
                to="https://docs.hoppscotch.io/changelog"
                blank
                @click="hide()"
              />
              <SmartItem
                :icon="IconActivity"
                :label="t('app.status')"
                to="https://status.hoppscotch.io"
                blank
                @click="hide()"
              />
              <hr />
              <SmartItem
                :icon="IconGithub"
                :label="`${t('app.github')}`"
                to="https://github.com/hoppscotch/hoppscotch"
                blank
                @click="hide()"
              />
              <SmartItem
                :icon="IconTwitter"
                :label="`${t('app.twitter')}`"
                to="https://hoppscotch.io/twitter"
                blank
                @click="hide()"
              />
              <SmartItem
                :icon="IconUserPlus"
                :label="`${t('app.invite')}`"
                @click="
                  () => {
                    showShare = true
                    hide()
                  }
                "
              />
              <SmartItem
                :icon="IconLock"
                :label="`${t('app.terms_and_privacy')}`"
                to="https://docs.hoppscotch.io/privacy"
                blank
                @click="hide()"
              />
              <div
                class="flex px-4 py-2 opacity-50"
                @dblclick="
                  () => {
                    showDeveloperOptionModal()
                    hide()
                  }
                "
              >
                {{ `${t("app.name")} v${version}` }}
              </div>
            </div>
          </template>
        </tippy>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconZap"
          :title="t('app.shortcuts')"
          @click="showShortcuts = true"
        />
        <ButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconShare2"
          :title="t('request.share')"
          @click="nativeShare()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="COLUMN_LAYOUT ? t('layout.row') : t('layout.column')"
          :icon="IconColumns"
          class="transform"
          :class="{ 'rotate-90': !COLUMN_LAYOUT }"
          @click="COLUMN_LAYOUT = !COLUMN_LAYOUT"
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
            :icon="IconSidebarOpen"
            class="transform"
            :class="{ 'rotate-180': !SIDEBAR }"
            @click="SIDEBAR = !SIDEBAR"
          />
        </span>
      </div>
    </div>
    <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
    <AppShare :show="showShare" @hide-modal="showShare = false" />
    <AppDeveloperOptions
      :show="showDeveloperOptions"
      @hide-modal="showDeveloperOptions = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue"
import { version } from "~/../package.json"
import IconSidebar from "~icons/lucide/sidebar"
import IconMinimize from "~icons/lucide/minimize"
import IconMaximize from "~icons/lucide/maximize"
import IconZap from "~icons/lucide/zap"
import IconShare2 from "~icons/lucide/share-2"
import IconColumns from "~icons/lucide/columns"
import IconSidebarOpen from "~icons/lucide/sidebar-open"
import IconShieldCheck from "~icons/lucide/shield-check"
import IconHelpCircle from "~icons/lucide/help-circle"
import IconBook from "~icons/lucide/book"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconGift from "~icons/lucide/gift"
import IconActivity from "~icons/lucide/activity"
import IconGithub from "~icons/lucide/github"
import IconTwitter from "~icons/lucide/twitter"
import IconUserPlus from "~icons/lucide/user-plus"
import IconLock from "~icons/lucide/lock"
import { defineActionHandler } from "~/helpers/actions"
import { showChat } from "@modules/crisp"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { currentUser$ } from "~/helpers/fb/auth"

const t = useI18n()
const showShortcuts = ref(false)
const showShare = ref(false)
const showDeveloperOptions = ref(false)

defineActionHandler("flyouts.keybinds.toggle", () => {
  showShortcuts.value = !showShortcuts.value
})

defineActionHandler("modals.share.toggle", () => {
  showShare.value = !showShare.value
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
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
const documentation = ref<any | null>(null)
const shortcuts = ref<any | null>(null)
const chat = ref<any | null>(null)
const options = ref<any | null>(null)
</script>
