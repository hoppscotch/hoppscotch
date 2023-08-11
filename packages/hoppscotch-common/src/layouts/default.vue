<template>
  <div class="flex w-screen h-screen">
    <Splitpanes class="no-splitter" :dbl-click-splitter="false" horizontal>
      <Pane v-if="!zenMode" style="height: auto">
        <AppHeader />
      </Pane>
      <Pane :class="spacerClass" class="flex flex-1 !overflow-auto md:mb-0">
        <Splitpanes
          class="no-splitter"
          :dbl-click-splitter="false"
          :horizontal="!mdAndLarger"
        >
          <Pane
            style="width: auto; height: auto"
            class="!overflow-auto hidden md:flex md:flex-col"
          >
            <AppSidenav />
          </Pane>
          <Pane class="flex flex-1 !overflow-auto">
            <Splitpanes
              class="no-splitter"
              :dbl-click-splitter="false"
              horizontal
            >
              <Pane class="flex flex-1 !overflow-auto">
                <main class="flex flex-1 w-full" role="main">
                  <RouterView
                    v-slot="{ Component }"
                    class="flex flex-1 min-w-0"
                  >
                    <Transition name="fade" mode="out-in" appear>
                      <component :is="Component" />
                    </Transition>
                  </RouterView>
                </main>
              </Pane>
            </Splitpanes>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane v-if="mdAndLarger" style="height: auto">
        <AppFooter />
      </Pane>
      <Pane
        v-else
        style="height: auto"
        class="!overflow-auto flex flex-col fixed inset-x-0 bottom-0 z-10"
      >
        <AppSidenav />
      </Pane>
    </Splitpanes>
    <AppActionHandler />
    <AppSpotlight :show="showSearch" @hide-modal="showSearch = false" />
    <AppSupport
      v-if="mdAndLarger"
      :show="showSupport"
      @hide-modal="showSupport = false"
    />
    <AppOptions v-else :show="showSupport" @hide-modal="showSupport = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount, onMounted, ref, watch } from "vue"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import { RouterView, useRouter } from "vue-router"
import { useSetting } from "@composables/settings"
import { defineActionHandler } from "~/helpers/actions"
import { hookKeybindingsListener } from "~/helpers/keybindings"
import { applySetting } from "~/newstore/settings"
import { getLocalConfig, setLocalConfig } from "~/newstore/localpersistence"
import { useToast } from "~/composables/toast"
import { useI18n } from "~/composables/i18n"

const router = useRouter()

const showSearch = ref(false)
const showSupport = ref(false)

const fontSize = useSetting("FONT_SIZE")
const expandNavigation = useSetting("EXPAND_NAVIGATION")
const zenMode = useSetting("ZEN_MODE")
const rightSidebar = useSetting("SIDEBAR")
const columnLayout = useSetting("COLUMN_LAYOUT")

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const toast = useToast()
const t = useI18n()

onBeforeMount(() => {
  if (!mdAndLarger.value) {
    rightSidebar.value = false
    columnLayout.value = true
  }
})

onMounted(() => {
  const cookiesAllowed = getLocalConfig("cookiesAllowed") === "yes"
  if (!cookiesAllowed) {
    toast.show(`${t("app.we_use_cookies")}`, {
      duration: 0,
      action: [
        {
          text: `${t("action.learn_more")}`,
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
            window
              .open("https://docs.hoppscotch.io/support/privacy", "_blank")
              ?.focus()
          },
        },
        {
          text: `${t("action.dismiss")}`,
          onClick: (_, toastObject) => {
            setLocalConfig("cookiesAllowed", "yes")
            toastObject.goAway(0)
          },
        },
      ],
    })
  }
})

watch(mdAndLarger, () => {
  if (mdAndLarger.value) rightSidebar.value = true
  else {
    rightSidebar.value = false
    columnLayout.value = true
  }
})

const spacerClass = computed(() => {
  if (fontSize.value === "small" && expandNavigation.value)
    return "spacer-small"
  if (fontSize.value === "medium" && expandNavigation.value)
    return "spacer-medium"
  if (fontSize.value === "large" && expandNavigation.value)
    return "spacer-large"
  if (
    (fontSize.value === "small" ||
      fontSize.value === "medium" ||
      fontSize.value === "large") &&
    !expandNavigation.value
  )
    return "spacer-expand"

  return ""
})

defineActionHandler("modals.search.toggle", () => {
  showSearch.value = !showSearch.value
})

defineActionHandler("modals.support.toggle", () => {
  showSupport.value = !showSupport.value
})

defineActionHandler("navigation.jump.rest", () => {
  router.push({ path: "/" })
})

defineActionHandler("navigation.jump.graphql", () => {
  router.push({ path: "/graphql" })
})

defineActionHandler("navigation.jump.realtime", () => {
  router.push({ path: "/realtime" })
})

defineActionHandler("navigation.jump.settings", () => {
  router.push({ path: "/settings" })
})

defineActionHandler("navigation.jump.profile", () => {
  router.push({ path: "/profile" })
})

defineActionHandler("settings.theme.system", () => {
  applySetting("BG_COLOR", "system")
})

defineActionHandler("settings.theme.light", () => {
  applySetting("BG_COLOR", "light")
})

defineActionHandler("settings.theme.dark", () => {
  applySetting("BG_COLOR", "dark")
})

defineActionHandler("settings.theme.black", () => {
  applySetting("BG_COLOR", "black")
})

hookKeybindingsListener()
</script>

<style lang="scss" scoped>
.spacer-small {
  margin-bottom: 4.2rem;
}

.spacer-medium {
  margin-bottom: 4.8rem;
}

.spacer-large {
  margin-bottom: 5.5rem;
}

.spacer-expand {
  margin-bottom: 2.9rem;
}

@media screen and (min-width: 768px) {
  .spacer-small {
    margin-bottom: 0;
  }

  .spacer-medium {
    margin-bottom: 0;
  }

  .spacer-large {
    margin-bottom: 0;
  }

  .spacer-expand {
    margin-bottom: 0;
  }
}
</style>
