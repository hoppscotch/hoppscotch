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
            d="M27.985 22.5a2.68 2.68 0 0 1-3.654.981 2.68 2.68 0 0 1-.981-3.654 2.68 2.68 0 0 1 3.654-.981c1.287.743 1.724 2.375.98 3.654M6.642 10.174a2.68 2.68 0 0 1-3.654.981A2.68 2.68 0 0 1 2.007 7.5a2.68 2.68 0 0 1 3.654-.981 2.68 2.68 0 0 1 .981 3.654M2.015 22.5a2.68 2.68 0 0 1 .981-3.654 2.68 2.68 0 0 1 3.654.981 2.68 2.68 0 0 1-.981 3.654c-1.287.735-2.92.3-3.654-.98m21.343-12.326a2.68 2.68 0 0 1 .981-3.654 2.68 2.68 0 0 1 3.654.981 2.68 2.68 0 0 1-.981 3.654 2.68 2.68 0 0 1-3.654-.981M15 30a2.674 2.674 0 1 1 2.674-2.673A2.68 2.68 0 0 1 15 30m0-24.652a2.67 2.67 0 0 1-2.674-2.674 2.67 2.67 0 1 1 5.347 0A2.67 2.67 0 0 1 15 5.347"
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
    <div v-if="$route.path === '/'">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#request" v-tooltip.right="$t('request')">
              <i class="material-icons">cloud_upload</i>
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
    <div v-else-if="$route.path === '/realtime'">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#request" v-tooltip.right="$t('request')">
              <i class="material-icons">cloud_upload</i>
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
    <div v-else-if="$route.path === '/graphql'">
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
              <i class="material-icons">cloud_upload</i>
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
    <div v-else-if="$route.path === '/doc'">
      <nav class="secondary-nav">
        <ul>
          <li>
            <a href="#collections" v-tooltip.right="$t('collections')">
              <i class="material-icons">folder</i>
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
    <div v-else-if="$route.path === '/settings'">
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
