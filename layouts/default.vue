<template>
  <div class="flex h-screen w-screen">
    <Splitpanes :dbl-click-splitter="false" horizontal>
      <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
        <Splitpanes
          :dbl-click-splitter="false"
          :horizontal="!(windowInnerWidth >= 768)"
        >
          <Pane
            v-if="LEFT_SIDEBAR"
            style="width: auto; height: auto"
            class="hide-scrollbar !overflow-auto"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
            <Splitpanes :dbl-click-splitter="false" horizontal>
              <Pane v-if="!ZEN_MODE" style="height: auto">
                <!-- <AppAnnouncement /> -->
                <AppHeader />
              </Pane>
              <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
                <main class="flex flex-1">
                  <nuxt class="flex flex-1" />
                </main>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane style="height: auto">
        <AppFooter />
      </Pane>
    </Splitpanes>
  </div>
</template>

<script lang="ts">
import { defineComponent, useRouter } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"
import { logPageView } from "~/helpers/fb/analytics"
import { hookKeybindingsListener } from "~/helpers/keybindings"
import { defineActionHandler } from "~/helpers/actions"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    hookKeybindingsListener()
    const router = useRouter()
    defineActionHandler("navigation.rest.jump", () => {
      router.push({ path: "/" })
    })
    defineActionHandler("navigation.graphql.jump", () => {
      router.push({ path: "/graphql" })
    })
    defineActionHandler("navigation.realtime.jump", () => {
      router.push({ path: "/realtime" })
    })
    defineActionHandler("navigation.documentation.jump", () => {
      router.push({ path: "/documentation" })
    })
    defineActionHandler("navigation.settings.jump", () => {
      router.push({ path: "/settings" })
    })
  },
  data() {
    return {
      LEFT_SIDEBAR: null,
      ZEN_MODE: null,
      windowInnerWidth: 0,
    }
  },
  subscriptions() {
    return {
      LEFT_SIDEBAR: getSettingSubject("LEFT_SIDEBAR"),
      ZEN_MODE: getSettingSubject("ZEN_MODE"),
    }
  },
  watch: {
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
      ;(this as any).$colorMode.preference = color
    })

    this.$subscribeTo(getSettingSubject("FONT_SIZE"), (size) => {
      document.documentElement.setAttribute("data-font-size", size.code)
    })
  },
  async mounted() {
    window.addEventListener("resize", this.handleResize)
    this.handleResize()
    performMigrations()
    console.log(
      "%cWe ❤︎ open source!",
      "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
    )
    console.log(
      "%cContribute: https://github.com/hoppscotch/hoppscotch",
      "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
    )

    const workbox = await (window as any).$workbox
    if (workbox) {
      workbox.addEventListener("installed", (event: any) => {
        if (event.isUpdate) {
          this.$toast.show(this.$t("app.new_version_found").toString(), {
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
  destroyed() {
    window.removeEventListener("resize", this.handleResize)
  },
  methods: {
    handleResize() {
      this.windowInnerWidth = window.innerWidth
    },
  },
})
</script>
