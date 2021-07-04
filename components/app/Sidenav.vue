<template>
  <aside>
    <nav class="flex flex-col flex-nowrap">
      <nuxt-link
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        :to="localePath(navigation.target)"
        class="
          p-4
          flex-col flex-1
          hover:bg-primaryDark hover:text-secondaryDark
          items-center
          justify-center
          transition
        "
      >
        <i class="material-icons opacity-75">{{ navigation.icon }}</i>
        <span class="mt-2 text-xs font-semibold">{{ navigation.title }}</span>
      </nuxt-link>
    </nav>
  </aside>
</template>

<script>
export default {
  data() {
    return {
      primaryNavigation: [
        { target: "index", icon: "home", title: "Home" },
        { target: "api", icon: "apps", title: "APIs" },
        { target: "realtime", icon: "language", title: "Realtime" },
        { target: "graphql", icon: "code", title: "GraphQL" },
        { target: "doc", icon: "book", title: "Docs" },
        { target: "profile", icon: "person", title: "Profile" },
        { target: "settings", icon: "settings", title: "Settings" },
      ],
    }
  },
}
</script>

<style scoped lang="scss">
.active {
  @apply text-accent;
}
</style>
