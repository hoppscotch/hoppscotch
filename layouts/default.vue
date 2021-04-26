<template>
  <div class="wrapper">
    <div class="content">
      <div class="columns">
        <AppSidenav />
        <main>
          <AppHeader />
          <nuxt />
          <AppFooter />
        </main>
      </div>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { performMigrations } from "~/helpers/migrations"

export default {
  beforeMount() {
    let color = localStorage.getItem("THEME_COLOR") || "green"
    document.documentElement.setAttribute("data-accent", color)
  },
  async mounted() {
    if (process.client) {
      document.body.classList.add("afterLoad")
    }

    performMigrations()

    console.log(
      "%cWe ❤︎ open source!",
      "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
    )
    console.log(
      "%cContribute: https://github.com/hoppscotch/hoppscotch",
      "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
    )

    // Update GraphQL Token on firebase ID Token changes
    fb.idToken$.subscribe((token) => {
      if (token) {
        console.log(token)
        this.$apolloHelpers.onLogin(token)
      } else {
        this.$apolloHelpers.onLogout()
      }
    })

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
                onClick: (e, toastObject) => {
                  toastObject.goAway(0)
                  this.$router.push("/", () => window.location.reload())
                },
              },
            ],
          })
        }
      })
    }

    setupLocalPersistence()
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
