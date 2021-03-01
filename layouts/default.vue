<template>
  <div class="wrapper">
    <div class="content">
      <div class="columns">
        <sidenav />
        <main class="container">
          <pw-header />
          <nuxt />
          <pw-footer />
        </main>
      </div>
    </div>
  </div>
</template>

<script>
import { fb } from "~/helpers/fb"

export default {
  beforeMount() {
    let color = localStorage.getItem("THEME_COLOR") || "green"
    document.documentElement.setAttribute("data-accent", color)
  },
  mounted() {
    if (process.client) {
      document.body.classList.add("afterLoad")
    }
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
        console.log(token);
        this.$apolloHelpers.onLogin(token)
      } else {
        this.$apolloHelpers.onLogout()
      }
    })
  },
  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
