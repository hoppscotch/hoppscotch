<template>
  <div>
    <div class="flex justify-between">
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="LEFT_SIDEBAR ? $t('hide_sidebar') : $t('show_sidebar')"
          icon="menu_open"
          :class="{ 'transform rotate-180': !LEFT_SIDEBAR }"
          @click.native="toggleSetting('LEFT_SIDEBAR')"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="`${ZEN_MODE ? $t('turn_off') : $t('turn_on')} ${$t(
            'zen_mode'
          )}`"
          :icon="ZEN_MODE ? 'fullscreen_exit' : 'fullscreen'"
          :class="{
            '!text-accent focus:text-accent hover:text-accent': ZEN_MODE,
          }"
          @click.native="toggleSetting('ZEN_MODE')"
        />
      </div>
      <div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          icon="keyboard"
          :title="$t('shortcuts')"
          :shortcut="[getSpecialKey(), '/']"
          @click.native="showShortcuts = true"
        />
        <ButtonSecondary
          v-if="navigatorShare"
          v-tippy="{ theme: 'tooltip' }"
          icon="share"
          :title="$t('share')"
          @click.native="nativeShare()"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="RIGHT_SIDEBAR ? $t('hide_sidebar') : $t('show_sidebar')"
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
import { getPlatformSpecialKey } from "~/helpers/platformutils"

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
    getSpecialKey: getPlatformSpecialKey,
  },
})
</script>
