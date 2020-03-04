<template>
  <div class="wrapper">
    <div class="content">
      <div class="columns">
        <sidenav />
        <div class="main" id="main">
          <pw-header />
          <nuxt />
          <pw-footer />
        </div>
        <!-- <aside class="nav-second"></aside> -->
      </div>
    </div>
  </div>
</template>

<script>
export default {
  components: {
    sidenav: () => import("../components/layout/sidenav"),
    "pw-header": () => import("../components/layout/header"),
    "pw-footer": () => import("../components/layout/footer"),
  },

  beforeMount() {
    // Load theme settings
    ;(() => {
      // Apply theme from settings.
      document.documentElement.className = this.$store.state.postwoman.settings.THEME_CLASS || ""
      // Load theme color data from settings, or use default color.
      let color = this.$store.state.postwoman.settings.THEME_COLOR || "#50fa7b"
      let vibrant = this.$store.state.postwoman.settings.THEME_COLOR_VIBRANT || true
      document.documentElement.style.setProperty("--ac-color", color)
      document.documentElement.style.setProperty(
        "--act-color",
        vibrant ? "rgba(32, 33, 36, 1)" : "rgba(255, 255, 255, 1)"
      )
    })()
  },

  mounted() {
    if (process.client) {
      document.body.classList.add("afterLoad")
    }

    document
      .querySelector("meta[name=theme-color]")
      .setAttribute("content", this.$store.state.postwoman.settings.THEME_TAB_COLOR || "#202124")

    console.log(
      "%cWe ❤︎ open source!",
      "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
    )
    console.log(
      "%cContribute: https://github.com/liyasthomas/postwoman",
      "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
    )
  },

  beforeDestroy() {
    document.removeEventListener("keydown", this._keyListener)
  },
}
</script>
