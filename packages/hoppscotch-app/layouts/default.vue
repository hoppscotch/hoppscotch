<template>
  <div class="flex h-screen w-screen">
    <Splitpanes class="no-splitter" :dbl-click-splitter="false" horizontal>
      <Pane v-if="!ZEN_MODE" style="height: auto">
        <AppHeader />
      </Pane>
      <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
        <Splitpanes
          class="no-splitter"
          :dbl-click-splitter="false"
          :horizontal="!(windowInnerWidth.x.value >= 768)"
        >
          <Pane
            style="width: auto; height: auto"
            class="hide-scrollbar !overflow-auto"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
            <Splitpanes
              class="no-splitter"
              :dbl-click-splitter="false"
              horizontal
            >
              <Pane class="flex flex-1 hide-scrollbar !overflow-auto">
                <main class="flex flex-1 w-full">
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
import {
  defineComponent,
  onBeforeMount,
  useContext,
  useRouter,
  watch,
} from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"
import { useSetting } from "~/newstore/settings"
import { logPageView } from "~/helpers/fb/analytics"
import { hookKeybindingsListener } from "~/helpers/keybindings"
import { defineActionHandler } from "~/helpers/actions"
import useWindowSize from "~/helpers/utils/useWindowSize"

function appLayout() {
  const rightSidebar = useSetting("RIGHT_SIDEBAR")
  const windowInnerWidth = useWindowSize()

  // Initially apply
  onBeforeMount(() => {
    if (windowInnerWidth.x.value < 768) rightSidebar.value = false
  })

  // Listen for updates
  watch(windowInnerWidth.x, () =>
    windowInnerWidth.x.value >= 768
      ? (rightSidebar.value = true)
      : (rightSidebar.value = false)
  )
}

function updateThemes() {
  const { $colorMode } = useContext() as any

  // Apply theme updates
  const themeColor = useSetting("THEME_COLOR")
  const bgColor = useSetting("BG_COLOR")
  const fontSize = useSetting("FONT_SIZE")

  // Initially apply
  onBeforeMount(() => {
    document.documentElement.setAttribute("data-accent", themeColor.value)
    $colorMode.preference = bgColor.value
    document.documentElement.setAttribute("data-font-size", fontSize.value)
  })

  // Listen for updates
  watch(themeColor, () =>
    document.documentElement.setAttribute("data-accent", themeColor.value)
  )
  watch(bgColor, () => ($colorMode.preference = bgColor.value))
  watch(fontSize, () =>
    document.documentElement.setAttribute("data-font-size", fontSize.value)
  )
}

function defineJumpActions() {
  const router = useRouter()

  defineActionHandler("navigation.jump.rest", () => {
    router.push({ path: "/" })
  })
  defineActionHandler("navigation.jump.graphql", () => {
    router.push({ path: "/graphql" })
  })
  defineActionHandler("navigation.jump.realtime", () => {
    router.push({ path: "/realtime" })
  })
  defineActionHandler("navigation.jump.documentation", () => {
    router.push({ path: "/documentation" })
  })
  defineActionHandler("navigation.jump.settings", () => {
    router.push({ path: "/settings" })
  })
  defineActionHandler("navigation.jump.back", () => {
    router.go(-1)
  })
  defineActionHandler("navigation.jump.forward", () => {
    router.go(1)
  })
}

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    appLayout()

    hookKeybindingsListener()

    defineJumpActions()

    updateThemes()

    return {
      windowInnerWidth: useWindowSize(),
      ZEN_MODE: useSetting("ZEN_MODE"),
    }
  },
  head() {
    return this.$nuxtI18nHead({ addSeoAttributes: true })
  },
  watch: {
    $route(to) {
      logPageView(to.fullPath)
    },
  },
  beforeMount() {
    setupLocalPersistence()

    registerApolloAuthUpdate()
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

    const workbox = await (window as any).$workbox
    if (workbox) {
      workbox.addEventListener("installed", (event: any) => {
        if (event.isUpdate) {
          this.$toast.show(this.$t("app.new_version_found").toString(), {
            icon: "download_for_offline",
            duration: 0,
            action: [
              {
                text: this.$t("app.reload").toString(),
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
})
</script>
