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
        <i class="material-icons">settings_input_hdmi</i>
      </nuxt-link>
      <nuxt-link
        :to="localePath('graphql')"
        :class="linkActive('/graphql')"
        v-tooltip.right="$t('graphql')"
        :aria-label="$t('graphql')"
      >
        <svg
          class="material-icons"
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          x="0px"
          y="0px"
          viewBox="0 0 400 400"
        >
          <g>
            <g>
              <g>
                <rect
                  x="122"
                  y="-0.4"
                  transform="matrix(-0.866 -0.5 0.5 -0.866 163.3196 363.3136)"
                  width="16.6"
                  height="320.3"
                />
              </g>
            </g>
            <g>
              <g>
                <rect x="39.8" y="272.2" width="320.3" height="16.6" />
              </g>
            </g>
            <g>
              <g>
                <rect
                  x="37.9"
                  y="312.2"
                  transform="matrix(-0.866 -0.5 0.5 -0.866 83.0693 663.3409)"
                  width="185"
                  height="16.6"
                />
              </g>
            </g>
            <g>
              <g>
                <rect
                  x="177.1"
                  y="71.1"
                  transform="matrix(-0.866 -0.5 0.5 -0.866 463.3409 283.0693)"
                  width="185"
                  height="16.6"
                />
              </g>
            </g>
            <g>
              <g>
                <rect
                  x="122.1"
                  y="-13"
                  transform="matrix(-0.5 -0.866 0.866 -0.5 126.7903 232.1221)"
                  width="16.6"
                  height="185"
                />
              </g>
            </g>
            <g>
              <g>
                <rect
                  x="109.6"
                  y="151.6"
                  transform="matrix(-0.5 -0.866 0.866 -0.5 266.0828 473.3766)"
                  width="320.3"
                  height="16.6"
                />
              </g>
            </g>
            <g>
              <g><rect x="52.5" y="107.5" width="16.6" height="185" /></g>
            </g>
            <g>
              <g>
                <rect x="330.9" y="107.5" width="16.6" height="185" />
              </g>
            </g>
            <g>
              <g>
                <rect
                  x="262.4"
                  y="240.1"
                  transform="matrix(-0.5 -0.866 0.866 -0.5 126.7953 714.2875)"
                  width="14.5"
                  height="160.9"
                />
              </g>
            </g>
            <path
              d="M369.5,297.9c-9.6,16.7-31,22.4-47.7,12.8c-16.7-9.6-22.4-31-12.8-47.7c9.6-16.7,31-22.4,47.7-12.8C373.5,259.9,379.2,281.2,369.5,297.9"
            />
            <path
              d="M90.9,137c-9.6,16.7-31,22.4-47.7,12.8c-16.7-9.6-22.4-31-12.8-47.7c9.6-16.7,31-22.4,47.7-12.8C94.8,99,100.5,120.3,90.9,137"
            />
            <path
              d="M30.5,297.9c-9.6-16.7-3.9-38,12.8-47.7c16.7-9.6,38-3.9,47.7,12.8c9.6,16.7,3.9,38-12.8,47.7C61.4,320.3,40.1,314.6,30.5,297.9"
            />
            <path
              d="M309.1,137c-9.6-16.7-3.9-38,12.8-47.7c16.7-9.6,38-3.9,47.7,12.8c9.6,16.7,3.9,38-12.8,47.7C340.1,159.4,318.7,153.7,309.1,137"
            />
            <path
              d="M200,395.8c-19.3,0-34.9-15.6-34.9-34.9c0-19.3,15.6-34.9,34.9-34.9c19.3,0,34.9,15.6,34.9,34.9C234.9,380.1,219.3,395.8,200,395.8"
            />
            <path
              d="M200,74c-19.3,0-34.9-15.6-34.9-34.9c0-19.3,15.6-34.9,34.9-34.9c19.3,0,34.9,15.6,34.9,34.9C234.9,58.4,219.3,74,200,74"
            />
          </g>
        </svg>
      </nuxt-link>
      <nuxt-link
        :to="localePath('doc')"
        :class="linkActive('/doc')"
        v-tooltip.right="$t('documentation')"
        :aria-label="$t('documentation')"
      >
        <i class="material-icons">books</i>
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
