<template>
  <div>
    <div class="flex justify-between bg-primary">
      <div class="flex">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="EXPAND_NAVIGATION ? t('hide.sidebar') : t('show.sidebar')"
          :icon="IconSidebar"
          class="transform"
          :class="{ '-rotate-180': !EXPAND_NAVIGATION }"
          @click="EXPAND_NAVIGATION = !EXPAND_NAVIGATION"
        />
        <HoppButtonSecondary
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
        <tippy interactive trigger="click" theme="popover">
          <HoppButtonSecondary
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
          interactive
          trigger="click"
          theme="popover"
          :on-shown="() => tippyActions!.focus()"
        >
          <HoppButtonSecondary
            :icon="IconLifeBuoy"
            class="!rounded-none"
            :label="`${t('app.help')}`"
          />
          <template #content="{ hide }">
            <div
              ref="tippyActions"
              class="flex flex-col focus:outline-none"
              tabindex="0"
              @keyup.d="documentation!.$el.click()"
              @keyup.s="shortcuts!.$el.click()"
              @keyup.c="chat!.$el.click()"
              @keyup.escape="hide()"
            >
              <HoppSmartItem
                ref="documentation"
                :icon="IconBook"
                :label="`${t('app.documentation')}`"
                to="https://docs.hoppscotch.io"
                blank
                :shortcut="['D']"
                @click="hide()"
              />
              <HoppSmartItem
                ref="shortcuts"
                :icon="IconZap"
                :label="`${t('app.keyboard_shortcuts')}`"
                :shortcut="['S']"
                @click="
                  () => {
                    invokeAction('flyouts.keybinds.toggle')
                    hide()
                  }
                "
              />
              <HoppSmartItem
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
              <HoppSmartItem
                :icon="IconGift"
                :label="`${t('app.whats_new')}`"
                to="https://docs.hoppscotch.io/documentation/changelog"
                blank
                @click="hide()"
              />
              <HoppSmartItem
                :icon="IconActivity"
                :label="t('app.status')"
                to="https://status.hoppscotch.io"
                blank
                @click="hide()"
              />
              <hr />
              <HoppSmartItem
                :icon="IconGithub"
                :label="`${t('app.github')}`"
                to="https://github.com/hoppscotch/hoppscotch"
                blank
                @click="hide()"
              />
              <HoppSmartItem
                :icon="IconTwitter"
                :label="`${t('app.twitter')}`"
                to="https://hoppscotch.io/twitter"
                blank
                @click="hide()"
              />
              <HoppSmartItem
                :icon="IconUserPlus"
                :label="`${t('app.invite')}`"
                @click="
                  () => {
                    invokeAction('modals.share.toggle')
                    hide()
                  }
                "
              />
              <HoppSmartItem
                :icon="IconLock"
                :label="`${t('app.terms_and_privacy')}`"
                to="https://docs.hoppscotch.io/support/privacy"
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
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t(
            'app.shortcuts'
          )} <kbd>${getSpecialKey()}</kbd><kbd>/</kbd>`"
          :icon="IconZap"
          @click="invokeAction('flyouts.keybinds.toggle')"
        />
        <HoppButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          :icon="IconShare2"
          :title="t('request.share')"
          @click="nativeShare()"
        />
        <HoppButtonSecondary
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
          <HoppButtonSecondary
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
import IconBook from "~icons/lucide/book"
import IconMessageCircle from "~icons/lucide/message-circle"
import IconGift from "~icons/lucide/gift"
import IconActivity from "~icons/lucide/activity"
import IconGithub from "~icons/lucide/github"
import IconTwitter from "~icons/lucide/twitter"
import IconUserPlus from "~icons/lucide/user-plus"
import IconLock from "~icons/lucide/lock"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import { showChat } from "@modules/crisp"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { platform } from "~/platform"
import { TippyComponent } from "vue-tippy"
import { getPlatformSpecialKey as getSpecialKey } from "~/helpers/platformutils"
import { invokeAction } from "@helpers/actions"
import { HoppSmartItem } from "@hoppscotch/ui"

const t = useI18n()
const showDeveloperOptions = ref(false)

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")
const SIDEBAR = useSetting("SIDEBAR")
const ZEN_MODE = useSetting("ZEN_MODE")
const COLUMN_LAYOUT = useSetting("COLUMN_LAYOUT")
const SIDEBAR_ON_LEFT = useSetting("SIDEBAR_ON_LEFT")

const navigatorShare = !!navigator.share

const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

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
const tippyActions = ref<TippyComponent | null>(null)
const documentation = ref<typeof HoppSmartItem>()
const shortcuts = ref<typeof HoppSmartItem>()
const chat = ref<typeof HoppSmartItem>()
</script>
