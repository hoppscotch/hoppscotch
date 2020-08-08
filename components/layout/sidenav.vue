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
        <logo alt class="material-icons" style="height: 24px;"></logo>
      </nuxt-link>
      <nuxt-link
        :to="localePath('realtime')"
        :class="linkActive('/realtime')"
        v-tooltip.right="$t('realtime')"
      >
        <icon icon="language" />
      </nuxt-link>
      <nuxt-link
        :to="localePath('graphql')"
        :class="linkActive('/graphql')"
        v-tooltip.right="$t('graphql')"
        :aria-label="$t('graphql')"
      >
        <icon :icon="graphql" />
      </nuxt-link>
      <nuxt-link
        :to="localePath('doc')"
        :class="linkActive('/doc')"
        v-tooltip.right="$t('documentation')"
        :aria-label="$t('documentation')"
      >
        <icon icon="topic" />
      </nuxt-link>
      <nuxt-link
        :to="localePath('settings')"
        :class="linkActive('/settings')"
        v-tooltip.right="$t('settings')"
        :aria-label="$t('settings')"
      >
        <icon icon="settings" />
      </nuxt-link>
    </nav>
    <div v-if="$route.path == '/'">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#request" v-tooltip.right="$t('request')">
              <icon icon="cloud_upload" />
            </a>
          </li>
          <li>
            <a href="#options" v-tooltip.right="$t('options')">
              <icon icon="toc" />
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('response')">
              <icon icon="cloud_download" />
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
              <icon icon="cloud_upload" />
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('communication')">
              <icon icon="cloud_download" />
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
              <icon icon="cloud" />
            </a>
          </li>
          <li>
            <a href="#schema" v-tooltip.right="$t('schema')">
              <icon icon="assignment_returned" />
            </a>
          </li>
          <li>
            <a href="#query" v-tooltip.right="$t('query')">
              <icon icon="cloud_upload" />
            </a>
          </li>
          <li>
            <a href="#response" v-tooltip.right="$t('response')">
              <icon icon="cloud_download" />
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
              <icon icon="folder" />
            </a>
          </li>
          <li>
            <a href="#documentation" v-tooltip.right="'Documentation'">
              <icon icon="insert_drive_file" />
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
              <icon icon="person" />
            </a>
          </li>
          <li>
            <a href="#theme" v-tooltip.right="$t('theme')">
              <icon icon="brush" />
            </a>
          </li>
          <li>
            <a href="#extensions" v-tooltip.right="$t('extensions')">
              <icon icon="extensions" />
            </a>
          </li>
          <li>
            <a href="#proxy" v-tooltip.right="$t('proxy')">
              <icon icon="public" />
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
  z-index: 1;
  height: 100vh;
  padding: 0 8px;
  background-color: var(--bg-dark-color);
  transition: all 0.2s ease-in-out;
}

nav.primary-nav {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;

  svg {
    fill: var(--fg-light-color);
    transition: all 0.2s ease-in-out;
  }

  a {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    padding: 14px;
    border-radius: 50%;
    background-color: var(--bg-light-color);
    color: var(--fg-light-color);
    fill: var(--fg-light-color);
    margin: 8px 0;

    &:hover {
      color: var(--fg-color);
      fill: var(--fg-color);

      svg {
        fill: var(--fg-color);
      }
    }

    &.nuxt-link-exact-active {
      background-color: var(--ac-color);
      color: var(--act-color);
      fill: var(--act-color);
      border-radius: 16px;

      svg {
        fill: var(--act-color);
      }
    }
  }
}

nav.secondary-nav {
  display: flex;
  flex-flow: column nowrap;
  align-items: center;
  justify-content: center;
  border-top: 2px dashed var(--brd-color);
  margin-top: 4px;

  ul {
    display: flex;
    flex-flow: column nowrap;

    li {
      display: flex;

      a {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        padding: 14px;
        border-radius: 50%;
        background-color: var(--bg-dark-color);
        color: var(--fg-light-color);
        fill: var(--fg-light-color);
        margin: 8px 0;

        &:hover {
          color: var(--fg-color);
          fill: var(--fg-color);
        }

        &.current {
          color: var(--ac-color);
          fill: var(--ac-color);
        }
      }
    }
  }
}

@media (max-width: $responsiveWidth) {
  .nav-first {
    position: fixed;
    top: auto;
    bottom: 0;
    height: auto;
    padding: 0;
    width: 100%;
    background-color: var(--bg-color);
    box-shadow: 0 2px 6px 0 rgba(0, 0, 0, 0.45);
  }

  nav.primary-nav {
    flex-flow: row nowrap;
    overflow: auto;
    justify-content: space-between;
    background-color: var(--bg-dark-color);

    a {
      background-color: transparent;
      margin: 8px;
      flex: 1;

      &.nuxt-link-exact-active {
        background-color: transparent;
        color: var(--ac-color);
        fill: var(--ac-color);

        svg {
          fill: var(--ac-color);
        }
      }
    }
  }

  nav.secondary-nav {
    display: none;
  }
}
</style>

<script>
export default {
  components: {
    logo: () => import("./logo"),
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

  watch: {
    $route() {
      // this.$toast.clear();
    },
  },
}
</script>
