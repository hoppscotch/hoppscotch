<template>
  <div>
    <div class="flex justify-between">
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="LEFT_SIDEBAR ? $t('hide.sidebar') : $t('show.sidebar')"
          icon="menu_open"
          :class="{ 'transform rotate-180': !LEFT_SIDEBAR }"
          @click.native="toggleSetting('LEFT_SIDEBAR')"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${
            ZEN_MODE ? $t('action.turn_off') : $t('action.turn_on')
          } ${$t('layout.zen_mode')}`"
          :icon="ZEN_MODE ? 'fullscreen_exit' : 'fullscreen'"
          :class="{
            '!text-accent focus:text-accent hover:text-accent': ZEN_MODE,
          }"
          @click.native="toggleSetting('ZEN_MODE')"
        />
      </div>
      <div class="flex">
        <span>
          <tippy
            ref="options"
            interactive
            tabindex="-1"
            trigger="click"
            theme="popover"
            arrow
          >
            <template #trigger>
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                icon="help_center"
                :title="$t('app.help')"
                :shortcut="['?']"
              />
            </template>
            <div class="flex flex-col">
              <SmartItem
                :label="$t('app.documentation')"
                to="https://github.com/hoppscotch/hoppscotch/wiki"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                :label="$t('app.keyboard_shortcuts')"
                @click.native="
                  showShortcuts = true
                  $refs.options.tippy().hide()
                "
              />
              <SmartItem
                :label="$t('app.whats_new')"
                to="https://github.com/hoppscotch/hoppscotch/blob/main/CHANGELOG.md"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <hr />
              <SmartItem
                :label="$t('app.twitter')"
                to="https://twitter.com/hoppscotch_io"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <SmartItem
                :label="$t('app.terms_and_privacy')"
                to="https://github.com/hoppscotch/hoppscotch/wiki/Privacy-Policy"
                blank
                @click.native="$refs.options.tippy().hide()"
              />
              <!-- <SmartItem :label="$t('app.status')" /> -->
              <div class="flex text-xs opacity-50 py-2 px-4">
                {{ `${$t("app.name")} ${$t("app.version")}` }}
              </div>
            </div>
          </tippy>
        </span>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          icon="keyboard"
          :title="$t('shortcuts')"
          :shortcut="['?']"
          @click.native="showShortcuts = true"
        />
        <ButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          icon="share"
          :title="$t('request.share')"
          @click.native="nativeShare()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="RIGHT_SIDEBAR ? $t('hide.sidebar') : $t('show.sidebar')"
          icon="menu_open"
          :class="['transform rotate-180', { 'rotate-0': !RIGHT_SIDEBAR }]"
          @click.native="toggleSetting('RIGHT_SIDEBAR')"
        />
      </div>
    </div>
    <AppShortcuts :show="showShortcuts" @close="showShortcuts = false" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import {
  defaultSettings,
  getSettingSubject,
  applySetting,
  toggleSetting,
} from "~/newstore/settings"
import type { KeysMatching } from "~/types/ts-utils"

type SettingsType = typeof defaultSettings

export default defineComponent({
  data() {
    return {
      LEFT_SIDEBAR: null,
      RIGHT_SIDEBAR: null,
      ZEN_MODE: null,
      showShortcuts: false,
      navigatorShare: navigator.share,
    }
  },
  subscriptions() {
    return {
      LEFT_SIDEBAR: getSettingSubject("LEFT_SIDEBAR"),
      RIGHT_SIDEBAR: getSettingSubject("RIGHT_SIDEBAR"),
      ZEN_MODE: getSettingSubject("ZEN_MODE"),
    }
  },
  watch: {
    ZEN_MODE(ZEN_MODE) {
      this.applySetting("LEFT_SIDEBAR", !ZEN_MODE)
      // this.applySetting("RIGHT_SIDEBAR", !ZEN_MODE)
    },
  },
  methods: {
    toggleSetting<K extends KeysMatching<SettingsType, boolean>>(key: K) {
      toggleSetting(key)
    },
    applySetting<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
      applySetting(key, value)
    },
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
  },
})
</script>
