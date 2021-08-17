<template>
  <aside class="flex h-full justify-between md:flex-col">
    <nav class="flex flex-nowrap md:flex-col">
      <NuxtLink
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
      </NuxtLink>
    </nav>
    <nav
      class="
        flex flex-nowrap
        p-4
        items-center
        justify-center
        md:(flex-col
        space-x-0 space-y-2)
      "
    >
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip', placement: 'top' }"
        :title="`${$t('app.search')} <kbd>/</kbd>`"
        icon="search"
        class="rounded"
        @click.native="showSearch = true"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip', placement: 'top' }"
        :title="$t('app.invite')"
        icon="person_add_alt"
        class="rounded"
        @click.native="showShare = true"
      />
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip', placement: 'top' }"
        :title="`${$t('support.title')} <kbd>?</kbd>`"
        icon="support"
        class="rounded"
        @click.native="showSupport = true"
      />
    </nav>
    <AppSearch :show="showSearch" @hide-modal="showSearch = false" />
    <AppSupport :show="showSupport" @hide-modal="showSupport = false" />
    <AppShare :show="showShare" @hide-modal="showShare = false" />
  </aside>
</template>

<script lang="ts">
import { defineComponent, ref } from "@nuxtjs/composition-api"
import { defineActionHandler } from "~/helpers/actions"

export default defineComponent({
  setup() {
    const showSearch = ref(false)
    const showSupport = ref(false)
    const showShare = ref(false)

    defineActionHandler("modals.search.toggle", () => {
      showSearch.value = !showSearch.value
    })

    defineActionHandler("modals.support.toggle", () => {
      showSupport.value = !showSupport.value
    })

    defineActionHandler("modals.share.toggle", () => {
      showShare.value = !showShare.value
    })

    return {
      showSearch,
      showSupport,
      showShare,
    }
  },
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
  }

  &.exact-active-link {
    @apply text-accent;
    @apply hover:text-accent;

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
