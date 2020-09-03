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
            <a href="#documentation" v-tooltip.right="'Documentation'">
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
