<template>
  <div class="flex h-screen w-screen">
    <Splitpanes horizontal class="hoppscotch-theme">
      <Pane class="flex-1">
        <Splitpanes vertical class="hoppscotch-theme">
          <Pane
            v-if="!hideNavigationPane"
            style="width: auto"
            class="overflow-y-auto bg-primaryLight flex items-stretch"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex-1">
            <Splitpanes
              horizontal
              :push-other-panes="false"
              class="hoppscotch-theme"
            >
              <Pane v-if="!zenMode" style="height: auto">
                <AppHeader />
              </Pane>
              <Pane class="flex-1">
                <Splitpanes vertical class="hoppscotch-theme">
                  <Pane class="overflow-y-auto">
                    <nuxt class="container" :hide-right-pane="hideRightPane" />
                  </Pane>
                </Splitpanes>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane style="height: auto" class="bg-primaryDark">
        <div class="flex justify-between">
          <div>
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="
                hideNavigationPane ? $t('show_sidebar') : $t('hide_sidebar')
              "
              icon="menu_open"
              :class="{ 'transform rotate-180': hideNavigationPane }"
              @click.native="hideNavigationPane = !hideNavigationPane"
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
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="hideRightPane ? $t('show_sidebar') : $t('hide_sidebar')"
            icon="menu_open"
            :class="['transform rotate-180', { ' rotate-0': hideRightPane }]"
            @click.native="hideRightPane = !hideRightPane"
          />
        </div>
      </Pane>
    </Splitpanes>
  </div>
</template>

<script>
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"

import {
  setupLocalPersistence,
  getLocalConfig,
} from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"

export default {
  components: { Splitpanes, Pane },
  data() {
    return {
      hideNavigationPane: false,
      zenMode: false,
      hideRightPane: false,
    }
  },
  watch: {
    zenMode(zenMode) {
      this.hideNavigationPane = this.hideRightPane = zenMode
    },
  },
  beforeMount() {
    registerApolloAuthUpdate()

    const color = getLocalConfig("THEME_COLOR") || "green"
    document.documentElement.setAttribute("data-accent", color)
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
          this.$toast.show(this.$t("new_version_found"), {
            icon: "info",
            duration: 0,
            theme: "toasted-primary",
            action: [
              {
                text: this.$t("reload"),
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

    setupLocalPersistence()

    initializeFirebase()
    initUserInfo()
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>

<style lang="scss" scoped>
.splitpanes--vertical > .splitpanes__splitter {
  display: none;
}
.splitpanes--horizontal > .splitpanes__splitter {
  display: none;
}
</style>
