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
              <Pane v-if="!hideHeaderPane" style="height: auto">
                <AppHeader />
              </Pane>
              <Pane class="flex-1">
                <Splitpanes vertical class="hoppscotch-theme">
                  <Pane class="overflow-y-auto">
                    <nuxt class="container" />
                  </Pane>
                </Splitpanes>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane style="height: auto" class="bg-primaryDark">
        <ButtonSecondary
          class="button icon"
          @click.native="hideNavigationPane = !hideNavigationPane"
        />
        <i class="material-icons">menu_open</i>
        <ButtonSecondary
          class="button icon"
          @click.native="hideHeaderPane = !hideHeaderPane"
        />
        <i class="material-icons">menu_open</i>
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
      hideHeaderPane: false,
    }
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
