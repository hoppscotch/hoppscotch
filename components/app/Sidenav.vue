<template>
  <aside>
    <nav class="flex flex-col flex-nowrap">
      <nuxt-link
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        :to="localePath(navigation.target)"
        class="
          p-4
          text-xs
          flex-col flex-1
          hover:bg-primaryLight
          items-center
          justify-center
        "
      >
        <i class="material-icons">{{ navigation.icon }}</i>
        <span class="mt-2">{{ navigation.title }}</span>
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
  computed: {
    currentNavigation() {
      return this.navigation.filter((item) =>
        this.$route.name.includes(item.primary)
      )
    },
  },
  mounted() {
    window.addEventListener("scroll", () => {
      const mainNavLinks = document.querySelectorAll("nav.secondary-nav a")
      const fromTop = window.scrollY
      mainNavLinks.forEach(({ hash, classList }) => {
        const section = document.querySelector(hash)
        if (
          section &&
          section.offsetTop <= fromTop &&
          section.offsetTop + section.offsetHeight > fromTop
        ) {
          classList.add("current")
        } else {
          classList.remove("current")
        }
      })
    })
  },
}
</script>

<style scoped lang="scss">
nav.secondary-nav {
  @apply flex flex-col flex-nowrap;
  @apply items-center;
  @apply justify-center;
  @apply border-t-2 border-dashed border-divider;
  @apply pt-2;
  @apply space-y-2;

  a {
    @apply inline-flex;
    @apply items-center;
    @apply justify-center;
    @apply flex-shrink-0;
    @apply p-4;
    @apply rounded-full;
    @apply bg-primaryDark;
    @apply text-secondaryLight;
    @apply fill-current;
    @apply outline-none;

    @apply ease-in-out;
    @apply duration-150;

    &:hover {
      @apply text-secondary;
      @apply fill-current;
    }

    &.current {
      @apply text-accent;
      @apply fill-current;
    }
  }
}
</style>
