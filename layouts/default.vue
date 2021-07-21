<template>
  <div class="flex h-screen w-screen">
    <Splitpanes horizontal :dbl-click-splitter="false">
      <Pane class="flex flex-1 overflow-auto">
        <Splitpanes vertical :dbl-click-splitter="false">
          <Pane
            v-if="!HIDE_NAVBAR"
            style="width: auto"
            class="hide-scrollbar overflow-auto"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 overflow-auto">
            <Splitpanes horizontal :dbl-click-splitter="false">
              <Pane v-if="!zenMode" style="height: auto">
                <!-- <AppAnnouncement /> -->
                <AppHeader />
              </Pane>
              <Pane class="flex flex-1 overflow-auto">
                <nuxt class="flex flex-1" :hide-right-pane="hideRightPane" />
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
              :title="HIDE_NAVBAR ? $t('show_sidebar') : $t('hide_sidebar')"
              icon="menu_open"
              :class="{ 'transform rotate-180': HIDE_NAVBAR }"
              @click.native="toggleSetting('HIDE_NAVBAR')"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="
                zenMode
                  ? `${$t('turn_off')} Zen mode`
                  : `${$t('turn_on')} Zen mode`
              "
              :icon="zenMode ? 'fullscreen_exit' : 'fullscreen'"
              :class="{
                'text-accent focus:text-accent hover:text-accent': zenMode,
              }"
              @click.native="zenMode = !zenMode"
            />
          </div>
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="hideRightPane ? $t('show_sidebar') : $t('hide_sidebar')"
              icon="menu_open"
              :class="['transform rotate-180', { ' rotate-0': hideRightPane }]"
              @click.native="hideRightPane = !hideRightPane"
            />
          </div>
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"
import { getSettingSubject, toggleSetting } from "~/newstore/settings"
import { logPageView } from "~/helpers/fb/analytics"

export default {
  components: { Splitpanes, Pane },
  data() {
    return {
      zenMode: false,
      hideRightPane: false,
      HIDE_NAVBAR: null,
    }
  },
  subscriptions() {
    return {
      HIDE_NAVBAR: getSettingSubject("HIDE_NAVBAR"),
    }
  },
  watch: {
    zenMode(zenMode) {
      this.hideNavigationPane = this.hideRightPane = zenMode
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
    toggleSetting(key) {
      toggleSetting(key)
    },
  },
}
</script>
