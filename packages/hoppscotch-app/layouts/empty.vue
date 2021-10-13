<template>
  <Nuxt />
</template>

<script lang="ts">
import {
  useContext,
  onBeforeMount,
  watch,
  defineComponent,
} from "@nuxtjs/composition-api"
import { setupLocalPersistence } from "~/newstore/localpersistence"
import { useSetting } from "~/newstore/settings"

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

export default defineComponent({
  setup() {
    updateThemes()
  },
  beforeMount() {
    setupLocalPersistence()
  },
})
</script>
