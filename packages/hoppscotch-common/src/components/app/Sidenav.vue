<template>
  <aside class="flex justify-between h-full md:flex-col">
    <nav class="flex flex-1 flex-nowrap md:flex-col md:flex-none bg-primary">
      <SmartLink
        v-for="(navigation, index) in primaryNavigation"
        :key="`navigation-${index}`"
        v-tippy="{
          theme: 'tooltip',
          placement: mdAndLarger ? 'right' : 'bottom',
          content: !EXPAND_NAVIGATION ? t(navigation.title) : null,
        }"
        :to="navigation.target"
        class="nav-link"
        tabindex="0"
        :exact="navigation.exact"
      >
        <div v-if="navigation.svg">
          <component :is="navigation.svg" class="svg-icons" />
        </div>
        <span v-if="EXPAND_NAVIGATION" class="nav-title">
          {{ t(navigation.title) }}
        </span>
      </SmartLink>
    </nav>
  </aside>
</template>

<script setup lang="ts">
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import IconLink2 from "~icons/lucide/link-2"
import IconGraphql from "~icons/hopp/graphql"
import IconGlobe from "~icons/lucide/globe"
import IconSettings from "~icons/lucide/settings"
import { useSetting } from "@composables/settings"
import { useI18n } from "@composables/i18n"

const t = useI18n()

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const EXPAND_NAVIGATION = useSetting("EXPAND_NAVIGATION")

const primaryNavigation = [
  {
    target: "/",
    svg: IconLink2,
    title: "navigation.rest",
    exact: true,
  },
  {
    target: "/graphql",
    svg: IconGraphql,
    title: "navigation.graphql",
    exact: false,
  },
  {
    target: "/realtime",
    svg: IconGlobe,
    title: "navigation.realtime",
    exact: false,
  },
  {
    target: "/settings",
    svg: IconSettings,
    title: "navigation.settings",
    exact: false,
  },
]
</script>

<style lang="scss" scoped>
.nav-link {
  @apply relative;
  @apply p-4;
  @apply flex flex-col flex-1;
  @apply items-center;
  @apply justify-center;
  @apply hover: (bg-primaryDark text-secondaryDark);
  @apply focus-visible: text-secondaryDark;
  @apply after:absolute;
  @apply after:inset-x-0;
  @apply after:md: inset-x-auto;
  @apply after:md: inset-y-0;
  @apply after:bottom-0;
  @apply after:md: bottom-auto;
  @apply after:md: left-0;
  @apply after:z-2;
  @apply after:h-0.5;
  @apply after:md: h-full;
  @apply after:w-full;
  @apply after:md: w-0.5;
  @apply after:content-DEFAULT;
  @apply focus: after: bg-divider;

  .svg-icons {
    @apply opacity-75;
  }

  .nav-title {
    @apply mt-2;
    @apply text-tiny;
  }

  &.router-link-active {
    @apply text-secondaryDark;
    @apply bg-primaryLight;
    @apply hover: text-secondaryDark;
    @apply after:bg-accent;

    .svg-icons {
      @apply opacity-100;
    }
  }

  &.exact-active-link {
    @apply text-secondaryDark;
    @apply bg-primaryLight;
    @apply hover: text-secondaryDark;
    @apply after:bg-accent;

    .svg-icons {
      @apply opacity-100;
    }
  }
}
</style>
