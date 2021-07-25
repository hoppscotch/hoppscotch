<template>
  <aside>
    <nav class="flex flex-col flex-nowrap">
      <nuxt-link
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        :to="localePath(navigation.target)"
        class="nav-link"
      >
        <i class="material-icons">{{ navigation.icon }}</i>
        <span>{{ navigation.title }}</span>
      </nuxt-link>
    </nav>
  </aside>
</template>

<script>
export default {
  data() {
    return {
      primaryNavigation: [
        { target: "index", icon: "apps", title: "App" },
        { target: "realtime", icon: "language", title: "Realtime" },
        { target: "graphql", icon: "code", title: "GraphQL" },
        { target: "documentation", icon: "book", title: "Doc" },
        { target: "profile", icon: "person", title: "Profile" },
        { target: "settings", icon: "settings", title: "Settings" },
        { target: "home", icon: "home", title: "Home" },
      ],
    }
  },
}
</script>

<style scoped lang="scss">
.nav-link {
  @apply p-4;
  @apply flex flex-col flex-1;
  @apply items-center;
  @apply justify-center;
  @apply transition;
  @apply hover:bg-primaryDark;
  @apply hover:text-secondaryDark;

  .material-icons {
    @apply opacity-75;
  }

  span {
    @apply mt-2;
    @apply font-semibold;
  }

  &.active {
    @apply text-accent;
    @apply hover:text-accent;

    .material-icons {
      @apply opacity-100;
    }
  }
}
</style>
