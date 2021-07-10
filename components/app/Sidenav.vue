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
        { target: "index", icon: "home", title: "Home" },
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
.nav-link {
  @apply p-4;
  @apply flex-col;
  @apply flex-1;
  @apply hover:bg-primaryDark;
  @apply hover:text-secondaryDark;
  @apply items-center;
  @apply justify-center;
  @apply transition;

  .material-icons {
    @apply transition-opacity;
    @apply opacity-50;
  }

  span {
    @apply mt-2;
    @apply text-xs;
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
