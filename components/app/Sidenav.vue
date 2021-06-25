<template>
  <TranslateSlideRight appear>
    <aside class="nav-first">
      <nav class="primary-nav">
        <!--
        We're using manual checks for linkActive because the query string
        seems to mess up the nuxt-link active class.
      -->
        <nuxt-link
          v-tooltip.right="$t('home')"
          :to="localePath('index')"
          :class="linkActive('index')"
          :aria-label="$t('home')"
        >
          <AppLogo alt class="material-icons" style="height: 24px" />
        </nuxt-link>
        <nuxt-link
          v-tooltip.right="$t('realtime')"
          :to="localePath('realtime')"
          :class="linkActive('realtime')"
        >
          <i class="material-icons">language</i>
        </nuxt-link>
        <nuxt-link
          v-tooltip.right="$t('graphql')"
          :to="localePath('graphql')"
          :class="linkActive('graphql')"
          :aria-label="$t('graphql')"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            height="24"
            width="24"
            viewBox="0 0 29.999 30"
          >
            <path d="M4.08 22.864l-1.1-.636L15.248.98l1.1.636z" />
            <path d="M2.727 20.53h24.538v1.272H2.727z" />
            <path
              d="M15.486 28.332L3.213 21.246l.636-1.1 12.273 7.086zm10.662-18.47L13.874 2.777l.636-1.1 12.273 7.086z"
            />
            <path d="M3.852 9.858l-.636-1.1L15.5 1.67l.636 1.1z" />
            <path
              d="M25.922 22.864l-12.27-21.25 1.1-.636 12.27 21.25zM3.7 7.914h1.272v14.172H3.7zm21.328 0H26.3v14.172h-1.272z"
            />
            <path d="M15.27 27.793l-.555-.962 10.675-6.163.555.962z" />
            <path
              d="M27.985 22.5a2.68 2.68 0 01-3.654.981 2.68 2.68 0 01-.981-3.654 2.68 2.68 0 013.654-.981 2.665 2.665 0 01.98 3.654M6.642 10.174a2.68 2.68 0 01-3.654.981A2.68 2.68 0 012.007 7.5a2.68 2.68 0 013.654-.981 2.68 2.68 0 01.981 3.654M2.015 22.5a2.68 2.68 0 01.981-3.654 2.68 2.68 0 013.654.981 2.68 2.68 0 01-.981 3.654c-1.287.735-2.92.3-3.654-.98m21.343-12.326a2.68 2.68 0 01.981-3.654 2.68 2.68 0 013.654.981 2.68 2.68 0 01-.981 3.654 2.68 2.68 0 01-3.654-.981M15 30a2.674 2.674 0 112.674-2.673A2.68 2.68 0 0115 30m0-24.652a2.67 2.67 0 01-2.674-2.674 2.67 2.67 0 115.347 0A2.67 2.67 0 0115 5.347"
            />
          </svg>
        </nuxt-link>
        <nuxt-link
          v-tooltip.right="$t('documentation')"
          :to="localePath('doc')"
          :class="linkActive('doc')"
          :aria-label="$t('documentation')"
        >
          <i class="material-icons">topic</i>
        </nuxt-link>
        <nuxt-link
          v-tooltip.right="$t('settings')"
          :to="localePath('settings')"
          :class="linkActive('settings')"
          :aria-label="$t('settings')"
        >
          <i class="material-icons">settings</i>
        </nuxt-link>
      </nav>
      <nav
        v-for="(link, index) in currentNavigation"
        :key="`link-${index}`"
        class="secondary-nav"
      >
        <a
          v-for="(item, itemIndex) in link.secondary"
          :key="`item-${itemIndex}`"
          v-tooltip.right="$t(item.tooltip)"
          :href="item.target"
        >
          <i class="material-icons">{{ item.icon }}</i>
        </a>
      </nav>
    </aside>
  </TranslateSlideRight>
</template>

<script>
export default {
  data() {
    return {
      navigation: [
        {
          primary: "index",
          secondary: [
            { tooltip: "request", target: "#request", icon: "cloud_upload" },
            { tooltip: "options", target: "#options", icon: "toc" },
            {
              tooltip: "response",
              target: "#response",
              icon: "cloud_download",
            },
          ],
        },
        {
          primary: "realtime",
          secondary: [
            { tooltip: "request", target: "#request", icon: "cloud_upload" },
            {
              tooltip: "communication",
              target: "#response",
              icon: "cloud_download",
            },
          ],
        },
        {
          primary: "graphql",
          secondary: [
            { tooltip: "endpoint", target: "#endpoint", icon: "cloud" },
            {
              tooltip: "schema",
              target: "#schema",
              icon: "assignment_returned",
            },
            { tooltip: "query", target: "#query", icon: "cloud_upload" },
            {
              tooltip: "response",
              target: "#response",
              icon: "cloud_download",
            },
          ],
        },
        {
          primary: "doc",
          secondary: [
            { tooltip: "import", target: "#import", icon: "folder" },
            {
              tooltip: "documentation",
              target: "#documentation",
              icon: "insert_drive_file",
            },
          ],
        },
        {
          primary: "settings",
          secondary: [
            { tooltip: "account", target: "#account", icon: "person" },
            { tooltip: "theme", target: "#theme", icon: "brush" },
            { tooltip: "extensions", target: "#extensions", icon: "extension" },
            { tooltip: "proxy", target: "#proxy", icon: "public" },
          ],
        },
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
  methods: {
    linkActive(path) {
      return {
        "nuxt-link-exact-active": this.$route.name.includes(path),
        "nuxt-link-active": this.$route.name.includes(path),
      }
    },
  },
}
</script>

<style scoped lang="scss">
.nav-first {
  @apply h-screen;
  @apply p-2;
  @apply bg-primaryDark;
  @apply transition;
  @apply ease-in-out;
  @apply duration-150;
  @apply space-y-2;
}

nav.primary-nav {
  @apply flex;
  @apply flex-col;
  @apply flex-nowrap;
  @apply items-center;
  @apply justify-center;
  @apply space-y-2;
  @apply w-full;

  svg {
    @apply fill-current;
  }

  a {
    @apply inline-flex;
    @apply items-center;
    @apply justify-center;
    @apply flex-shrink-0;
    @apply p-4;
    @apply rounded-full;
    @apply bg-primaryLight;
    @apply text-secondaryLight;
    @apply fill-current;
    @apply outline-none;
    @apply transition;
    @apply ease-in-out;
    @apply duration-150;

    border-radius: 50%;
    transition-property: all !important;

    &:hover {
      @apply text-secondary;
      @apply fill-current;

      svg {
        @apply fill-current;
      }
    }

    &.nuxt-link-exact-active {
      @apply bg-accent;
      @apply text-primary;
      @apply fill-current;

      border-radius: 16px;

      svg {
        @apply fill-current;
      }
    }
  }
}

nav.primary-nav::-webkit-scrollbar,
.nav-first::-webkit-scrollbar {
  @apply hidden;
}

nav.secondary-nav {
  @apply flex;
  @apply flex-col;
  @apply flex-nowrap;
  @apply items-center;
  @apply justify-center;
  @apply border-t-2;
  @apply border-dashed;
  @apply border-divider;
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
    @apply transition;
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

@media (max-width: 767px) {
  .nav-first {
    @apply fixed;
    @apply z-10;
    @apply top-auto;
    @apply bottom-0;
    @apply h-auto;
    @apply p-0;
    @apply w-full;
    @apply bg-primary;
    @apply shadow-2xl;
  }

  nav.primary-nav {
    @apply flex-row;
    @apply flex-nowrap;
    @apply overflow-auto;
    @apply bg-primaryDark;
    @apply space-y-0;

    padding-bottom: env(safe-area-inset-bottom);

    a {
      @apply bg-transparent;
      @apply my-2;
      @apply flex-1;

      &.nuxt-link-exact-active {
        @apply bg-transparent;
        @apply text-accent;
        @apply fill-current;

        svg {
          @apply fill-current;
        }
      }
    }
  }

  nav.secondary-nav {
    @apply hidden;
  }
}
</style>
