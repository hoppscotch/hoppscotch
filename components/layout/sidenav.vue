<template>
  <aside class="nav-first">
    <nav class="primary-nav">
      <!--
        We're using manual checks for linkActive because the query string
        seems to mess up the nuxt-link active class.
      -->
      <nuxt-link
        :to="localePath('index')"
        :class="linkActive('/')"
        v-tooltip.right="$t('home')"
        :aria-label="$t('home')"
      >
        <logo alt class="material-icons" style="height: 24px"></logo>
      </nuxt-link>
      <nuxt-link
        :to="localePath('realtime')"
        :class="linkActive('/realtime')"
        v-tooltip.right="$t('realtime')"
      >
        <i class="material-icons">language</i>
      </nuxt-link>
      <nuxt-link
        :to="localePath('graphql')"
        :class="linkActive('/graphql')"
        v-tooltip.right="$t('graphql')"
        :aria-label="$t('graphql')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" height="24" width="24" viewBox="0 0 29.999 30">
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
        :to="localePath('doc')"
        :class="linkActive('/doc')"
        v-tooltip.right="$t('documentation')"
        :aria-label="$t('documentation')"
      >
        <i class="material-icons">topic</i>
      </nuxt-link>
      <nuxt-link
        :to="localePath('settings')"
        :class="linkActive('/settings')"
        v-tooltip.right="$t('settings')"
        :aria-label="$t('settings')"
      >
        <i class="material-icons">settings</i>
      </nuxt-link>
    </nav>
    <div v-if="$route.path == '/'">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#request" v-tooltip.right="$t('request')">
              <cloudUploadIcon class="material-icons" />
            </a>
          </li>
          <li>
            <a href="#options" v-tooltip.right="$t('options')">
              <i class="material-icons">toc</i>
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('response')">
              <i class="material-icons">cloud_download</i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div v-else-if="$route.path.includes('/realtime')">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#request" v-tooltip.right="$t('request')">
              <cloudUploadIcon class="material-icons" />
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('communication')">
              <i class="material-icons">cloud_download</i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div v-else-if="$route.path.includes('/graphql')">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#endpoint" v-tooltip.right="$t('endpoint')">
              <i class="material-icons">cloud</i>
            </a>
          </li>
          <li>
            <a href="#schema" v-tooltip.right="$t('schema')">
              <i class="material-icons">assignment_returned</i>
            </a>
          </li>
          <li>
            <a href="#query" v-tooltip.right="$t('query')">
              <cloudUploadIcon class="material-icons" />
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('response')">
              <i class="material-icons">cloud_download</i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div v-else-if="$route.path.includes('/doc')">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#import" v-tooltip.right="$t('import')">
              <folderIcon class="material-icons" />
            </a>
          </li>
          <li>
            <a href="#documentation" v-tooltip.right="$t('documentation')">
              <i class="material-icons">insert_drive_file</i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
    <div v-else-if="$route.path.includes('/settings')">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#account" v-tooltip.right="$t('account')">
              <i class="material-icons">person</i>
            </a>
          </li>
          <li>
            <a href="#theme" v-tooltip.right="$t('theme')">
              <i class="material-icons">brush</i>
            </a>
          </li>
          <li>
            <a href="#extensions" v-tooltip.right="$t('extensions')">
              <i class="material-icons">extensions</i>
            </a>
          </li>
          <li>
            <a href="#proxy" v-tooltip.right="$t('proxy')">
              <i class="material-icons">public</i>
            </a>
          </li>
        </ul>
      </nav>
    </div>
  </aside>
</template>

<style scoped lang="scss">
$responsiveWidth: 768px;

.nav-first {
  @apply z-10;
  @apply h-screen;
  @apply p-2;
  @apply bg-bgDarkColor;
  @apply transition;
  @apply ease-in-out;
  @apply duration-200;
  // @apply overflow-y-auto;
}

nav.primary-nav {
  @apply flex;
  @apply flex-col;
  @apply flex-no-wrap;
  @apply items-center;
  @apply justify-center;
  @apply space-y-2;

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
    @apply bg-bgLightColor;
    @apply text-fgLightColor;
    @apply fill-current;
    @apply outline-none;
    @apply transition;
    @apply ease-in-out;
    @apply duration-200;

    &:hover {
      @apply text-fgColor;
      @apply fill-current;

      svg {
        @apply fill-current;
      }
    }

    &.nuxt-link-exact-active {
      @apply bg-acColor;
      @apply text-actColor;
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
  @apply flex-no-wrap;
  @apply items-center;
  @apply justify-center;
  @apply border-t-2;
  @apply border-dashed;
  @apply border-brdColor;
  @apply mt-2;

  ul {
    @apply flex;
    @apply flex-col;
    @apply flex-no-wrap;
    @apply space-y-2;
    @apply py-1;

    li {
      @apply flex;

      a {
        @apply p-4;
        @apply rounded-full;
        @apply bg-bgDarkColor;
        @apply text-fgLightColor;
        @apply fill-current;
        @apply outline-none;
        @apply transition;
        @apply ease-in-out;
        @apply duration-200;

        &:hover {
          @apply text-fgColor;
          @apply fill-current;
        }

        &.current {
          @apply text-acColor;
          @apply fill-current;
        }
      }
    }
  }
}

@media (max-width: $responsiveWidth) {
  .nav-first {
    @apply fixed;
    @apply top-auto;
    @apply bottom-0;
    @apply h-auto;
    @apply p-0;
    @apply w-full;
    @apply bg-bgColor;
    @apply shadow-2xl;
  }

  nav.primary-nav {
    @apply flex-row;
    @apply flex-no-wrap;
    @apply overflow-auto;
    @apply justify-between;
    @apply bg-bgDarkColor;
    @apply space-y-0;

    padding-bottom: env(safe-area-inset-bottom);

    a {
      @apply bg-transparent;
      @apply m-2;
      @apply flex-1;

      &.nuxt-link-exact-active {
        @apply bg-transparent;
        @apply text-acColor;
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

<script>
import cloudUploadIcon from "~/static/icons/cloud_upload-24px.svg?inline"
import folderIcon from "~/static/icons/folder-24px.svg?inline"

export default {
  components: {
    cloudUploadIcon,
    folderIcon,
  },
  methods: {
    linkActive(path) {
      return {
        "nuxt-link-exact-active": this.$route.path === path,
        "nuxt-link-active": this.$route.path === path,
      }
    },
  },
  mounted() {
    window.addEventListener("scroll", (event) => {
      let mainNavLinks = document.querySelectorAll("nav ul li a")
      let fromTop = window.scrollY
      mainNavLinks.forEach(({ hash, classList }) => {
        let section = document.querySelector(hash)
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
  // watch: {
  //   $route() {
  //     // this.$toast.clear();
  //   },
  // },
}
</script>
