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
        <span v-if="EXPAND_NAVIGATION">{{ navigation.title }}</span>
        <tippy
          v-if="!EXPAND_NAVIGATION"
          :placement="windowInnerWidth.x.value >= 768 ? 'right' : 'bottom'"
          theme="tooltip"
          :content="navigation.title"
        />
      </NuxtLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import useWindowSize from "~/helpers/utils/useWindowSize"
import { useSetting } from "~/newstore/settings"
import { useI18n } from "~/helpers/utils/composables"

const t = useI18n()

const windowInnerWidth = useWindowSize()
const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")

const primaryNavigation = [
  {
    target: "index",
    svg: "link-2",
    title: t("navigation.rest"),
  },
  {
    target: "graphql",
    svg: "graphql",
    title: t("navigation.graphql"),
  },
  {
    target: "realtime",
    svg: "globe",
    title: t("navigation.realtime"),
  },
  {
    target: "documentation",
    svg: "book-open",
    title: t("navigation.doc"),
  },
  {
    target: "settings",
    svg: "settings",
    title: t("navigation.settings"),
  },
]
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
