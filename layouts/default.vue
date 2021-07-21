<template>
  <div class="flex h-screen w-screen">
    <Splitpanes horizontal :dbl-click-splitter="false">
      <Pane class="flex flex-1 overflow-auto">
        <Splitpanes vertical :dbl-click-splitter="false">
          <Pane
            v-if="LEFT_SIDEBAR"
            style="width: auto"
            class="hide-scrollbar overflow-auto"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 overflow-auto">
            <Splitpanes horizontal :dbl-click-splitter="false">
              <Pane v-if="!ZEN_MODE" style="height: auto">
                <!-- <AppAnnouncement /> -->
                <AppHeader />
              </Pane>
              <Pane class="flex flex-1 overflow-auto">
                <nuxt class="flex flex-1" :hide-right-pane="RIGHT_SIDEBAR" />
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane style="height: auto">
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
                'text-accent focus:text-accent hover:text-accent': ZEN_MODE,
              }"
              @click.native="toggleSetting('ZEN_MODE')"
            />
          </div>
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="RIGHT_SIDEBAR ? $t('hide_sidebar') : $t('show_sidebar')"
              icon="menu_open"
              :class="['transform rotate-180', { 'rotate-0': !RIGHT_SIDEBAR }]"
              @click.native="toggleSetting('RIGHT_SIDEBAR')"
            />
          </div>
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"
import {
  defaultSettings,
  getSettingSubject,
  applySetting,
  toggleSetting,
} from "~/newstore/settings"
import { logPageView } from "~/helpers/fb/analytics"
import type { KeysMatching } from "~/types/ts-utils"

type SettingsType = typeof defaultSettings

export default defineComponent({
  components: { Splitpanes, Pane },
  data() {
    return {
      LEFT_SIDEBAR: null,
      RIGHT_SIDEBAR: null,
      ZEN_MODE: null,
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
      this.applySetting("RIGHT_SIDEBAR", !ZEN_MODE)
    },
    $route(to) {
      logPageView(to.fullPath)
    },
  },
  beforeMount() {
    setupLocalPersistence()

    registerApolloAuthUpdate()

    this.$subscribeTo(getSettingSubject("THEME_COLOR"), (color) => {
      document.documentElement.setAttribute("data-accent", color)
    })

    this.$subscribeTo(getSettingSubject("BG_COLOR"), (color) => {
      this.$colorMode.preference = color
    })
  },
  async mounted() {
    performMigrations()
    console.log(
      "%cWe ❤︎ open source!",
      "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
    )
    console.log(
      "%cContribute: https://github.com/hoppscotch/hoppscotch",
      "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
    )

    const workbox = await window.$workbox
    if (workbox) {
      workbox.addEventListener("installed", (event) => {
        if (event.isUpdate) {
          this.$toast.show(this.$t("new_version_found").toString(), {
            icon: "info",
            duration: 0,
            theme: "toasted-primary",
            action: [
              {
                text: this.$t("reload").toString(),
                onClick: (_, toastObject) => {
                  toastObject.goAway(0)
                  window.location.reload()
                },
              },
            ],
          })
        }
      })
    }

    initializeFirebase()
    initUserInfo()

    logPageView(this.$router.currentRoute.fullPath)
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
  methods: {
    toggleSetting<K extends KeysMatching<SettingsType, boolean>>(key: K) {
      toggleSetting(key)
    },
    applySetting<K extends keyof SettingsType>(key: K, value: SettingsType[K]) {
      applySetting(key, value)
    },
  },
})
</script>
