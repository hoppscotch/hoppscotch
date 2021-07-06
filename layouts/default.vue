<template>
  <div class="wrapper">
    <div class="content">
      <div class="columns">
        <AppSidenav />
        <main>
          <AppHeader />
          <nuxt class="container" />
          <AppFooter />
        </main>
      </div>
    </div>
  </div>
</template>

<script>
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"
import { initUserInfo } from "~/helpers/teams/BackendUserInfo"
import { registerApolloAuthUpdate } from "~/helpers/apollo"
import { initializeFirebase } from "~/helpers/fb"
import { getSettingSubject } from "~/newstore/settings"

export default {
  beforeMount() {
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

    setupLocalPersistence()

    initializeFirebase()
    initUserInfo()
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
