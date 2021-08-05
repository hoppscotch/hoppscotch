<template>
  <aside>
    <nav class="flex flex-nowrap md:flex-col">
      <nuxt-link
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        :to="localePath(navigation.target)"
        class="nav-link"
      >
        <i v-if="navigation.icon" class="material-icons">
          {{ navigation.icon }}
        </i>
        <div v-if="navigation.svg" class="h-4 w-4">
          <SmartIcon :name="navigation.svg" class="svg-icons" />
        </div>
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
        {
          target: "index",
          icon: "settings_ethernet",
          title: this.$t("navigation.rest"),
        },
        {
          target: "graphql",
          svg: "graphql",
          title: this.$t("navigation.graphql"),
        },
        {
          target: "realtime",
          icon: "language",
          title: this.$t("navigation.realtime"),
        },
        {
          target: "documentation",
          icon: "book",
          title: this.$t("navigation.doc"),
        },
        {
          target: "settings",
          icon: "settings",
          title: this.$t("navigation.settings"),
        },
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

  .material-icons,
  .svg-icons {
    @apply opacity-75;
  }

  span {
    @apply mt-2;
    @apply font-semibold;
  }

  &.exact-active-link {
    @apply text-accent;
    @apply hover:text-accent;

    .material-icons,
    .svg-icons {
      @apply opacity-100;
    }
  }
}
</style>
