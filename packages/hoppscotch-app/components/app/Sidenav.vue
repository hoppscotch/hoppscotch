<template>
  <aside class="flex h-full justify-between md:flex-col">
    <nav class="flex flex-nowrap md:flex-col flex-1 md:flex-none">
      <NuxtLink
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        :to="localePath(navigation.target)"
        class="nav-link"
        tabindex="0"
      >
        <i v-if="navigation.icon" class="material-icons">
          {{ navigation.icon }}
        </i>
        <div v-if="navigation.svg">
          <SmartIcon :name="navigation.svg" class="svg-icons" />
        </div>
        <span v-if="LEFT_SIDEBAR">{{ navigation.title }}</span>
        <tippy
          v-if="!LEFT_SIDEBAR"
          :placement="windowInnerWidth.x.value >= 768 ? 'right' : 'bottom'"
          theme="tooltip"
          :content="navigation.title"
        />
      </NuxtLink>
    </nav>
  </aside>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import useWindowSize from "~/helpers/utils/useWindowSize"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    return {
      windowInnerWidth: useWindowSize(),
      LEFT_SIDEBAR: useSetting("LEFT_SIDEBAR"),
    }
  },
  data() {
    return {
      primaryNavigation: [
        {
          target: "index",
          svg: "link-2",
          title: this.$t("navigation.rest"),
        },
        {
          target: "graphql",
          svg: "graphql",
          title: this.$t("navigation.graphql"),
        },
        {
          target: "realtime",
          svg: "globe",
          title: this.$t("navigation.realtime"),
        },
        {
          target: "documentation",
          svg: "book-open",
          title: this.$t("navigation.doc"),
        },
        {
          target: "settings",
          svg: "settings",
          title: this.$t("navigation.settings"),
        },
      ],
    }
  },
})
</script>

<style scoped lang="scss">
.nav-link {
  @apply relative;
  @apply p-4;
  @apply flex flex-col flex-1;
  @apply items-center;
  @apply justify-center;
  @apply hover:(bg-primaryDark text-secondaryDark);
  @apply focus-visible:text-secondaryDark;

  &::after {
    @apply absolute;
    @apply inset-x-0;
    @apply md:inset-x-auto;
    @apply md:inset-y-0;
    @apply bottom-0;
    @apply md:bottom-auto;
    @apply md:left-0;
    @apply z-2;
    @apply h-0.5;
    @apply md:h-full;
    @apply w-full;
    @apply md:w-0.5;

    content: "";
  }

  &:focus::after {
    @apply bg-divider;
  }

  .material-icons,
  .svg-icons {
    @apply opacity-75;
  }

  span {
    @apply mt-2;
    @apply font-font-medium;

    font-size: calc(var(--body-font-size) - 0.062rem);
  }

  &.exact-active-link {
    @apply text-secondaryDark;
    @apply bg-primaryLight;
    @apply hover:text-secondaryDark;

    .material-icons,
    .svg-icons {
      @apply opacity-100;
    }

    &::after {
      @apply bg-accent;
    }
  }
}
</style>
