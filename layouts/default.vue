<template>
  <div class="wrapper">
    <div class="content">
      <div class="columns">
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
                  <a href="#proxy" v-tooltip.right="$t('proxy')">
                    <i class="material-icons">public</i>
                  </a>
                </li>
              </ul>
            </nav>
          </div>
        </aside>
        <div class="main" id="main">
          <header class="header">
            <div class="flex-wrap">
              <span class="slide-in">
                <nuxt-link :to="localePath('index')">
                  <h1 class="logo">Postwoman</h1>
                </nuxt-link>
              </span>
              <span>
                <a
                  href="https://github.com/liyasthomas/postwoman"
                  target="_blank"
                  aria-label="GitHub"
                  rel="noopener"
                >
                  <button class="icon" aria-label="GitHub" v-tooltip="'GitHub'">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      class="material-icons"
                    >
                      <path
                        d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"
                      />
                    </svg>
                  </button>
                </a>
                <button
                  class="icon"
                  id="installPWA"
                  @click.prevent="showInstallPrompt()"
                  v-tooltip="$t('install_pwa')"
                >
                  <i class="material-icons">offline_bolt</i>
                </button>
                <login v-if="!fb.currentUser" />
                <span v-if="fb.currentUser">
                  <v-popover>
                    <button
                      class="icon"
                      v-tooltip="
                        (fb.currentUser.displayName ||
                          '<label><i>Name not found</i></label>') +
                          '<br>' +
                          (fb.currentUser.email ||
                            '<label><i>Email not found</i></label>')
                      "
                      aria-label="Account"
                    >
                      <img
                        v-if="fb.currentUser.photoURL"
                        :src="fb.currentUser.photoURL"
                        class="material-icons"
                        alt="Profile image"
                      />
                      <i v-else class="material-icons">account_circle</i>
                    </button>
                    <template slot="popover">
                      <div>
                        <nuxt-link :to="localePath('settings')" v-close-popover>
                          <button class="icon">
                            <i class="material-icons">settings</i>
                            <span>
                              {{ $t("settings") }}
                            </span>
                          </button>
                        </nuxt-link>
                      </div>
                      <div>
                        <button class="icon" @click="logout" v-close-popover>
                          <i class="material-icons">exit_to_app</i>
                          <span>{{ $t("logout") }}</span>
                        </button>
                      </div>
                    </template>
                  </v-popover>
                </span>
                <v-popover>
                  <button class="icon" v-tooltip="$t('more')">
                    <i class="material-icons">more_vert</i>
                  </button>
                  <template slot="popover">
                    <div>
                      <button
                        class="icon"
                        @click="showExtensions = true"
                        v-close-popover
                      >
                        <i class="material-icons">extension</i>
                        <span>{{ $t("extensions") }}</span>
                      </button>
                    </div>
                    <div>
                      <button
                        class="icon"
                        @click="showShortcuts = true"
                        v-close-popover
                      >
                        <i class="material-icons">keyboard</i>
                        <span>{{ $t("shortcuts") }}</span>
                      </button>
                    </div>
                    <div>
                      <button
                        class="icon"
                        @click="showSupport = true"
                        v-close-popover
                      >
                        <i class="material-icons">favorite</i>
                        <span>{{ $t("support_us") }}</span>
                      </button>
                    </div>
                    <div>
                      <button
                        class="icon"
                        onClick="window.open('https://twitter.com/share?text=👽 Postwoman • API request builder - Helps you create your requests faster, saving you precious time on your development&url=https://postwoman.io&hashtags=postwoman&via=liyasthomas');"
                        v-close-popover
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="24"
                          height="24"
                          viewBox="0 0 24 24"
                        >
                          <path
                            d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"
                          />
                        </svg>
                        <span>{{ $t("tweet") }}</span>
                      </button>
                    </div>
                  </template>
                </v-popover>
              </span>
            </div>
          </header>
          <nuxt />
          <footer class="footer">
            <div class="flex-wrap">
              <span v-if="version.name" class="mono">
                <a
                  class="link"
                  :href="
                    'https://github.com/liyasthomas/postwoman/releases/tag/' +
                      version.name
                  "
                  target="_blank"
                  rel="noopener"
                  v-tooltip="'GitHub'"
                >
                  {{ version.name }}
                </a>
                <a
                  class="link"
                  href="https://www.netlify.com"
                  target="_blank"
                  rel="noopener"
                >
                  Powered by Netlify
                </a>
                <!-- <span v-if="version.hash">
                  -
                  <a
                    :href="'https://github.com/liyasthomas/postwoman/commit/' + version.hash"
                    target="_blank"
                    rel="noopener"
                  >{{version.hash}}</a>
                </span> -->
                <!-- <span v-if="version.variant">({{version.variant}})</span> -->
              </span>
              <span>
                <a
                  href="https://liyasthomas.web.app"
                  target="_blank"
                  rel="noopener"
                >
                  <button class="icon" v-tooltip="'Liyas Thomas'">
                    🦄
                  </button>
                </a>
                <a
                  href="mailto:liyascthomas@gmail.com"
                  target="_blank"
                  rel="noopener"
                >
                  <button class="icon" v-tooltip="$t('contact_us')">
                    <i class="material-icons">email</i>
                  </button>
                </a>
                <v-popover>
                  <button class="icon" v-tooltip="$t('choose_language')">
                    <i class="material-icons">translate</i>
                  </button>
                  <template slot="popover">
                    <div v-for="locale in availableLocales" :key="locale.code">
                      <nuxt-link :to="switchLocalePath(locale.code)">
                        <button class="icon" v-close-popover>
                          {{ locale.name }}
                        </button>
                      </nuxt-link>
                    </div>
                  </template>
                </v-popover>
              </span>
            </div>
          </footer>
        </div>
        <aside class="nav-second"></aside>
      </div>
    </div>
    <modal v-if="showExtensions" @close="showExtensions = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("extensions") }}</h3>
              <div>
                <button class="icon" @click="showExtensions = false">
                  <i class="material-icons">close</i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <p class="info">
          {{ $t("extensions_info1") }}
        </p>
        <div>
          <a
            href="https://addons.mozilla.org/en-US/firefox/addon/postwoman"
            target="_blank"
            rel="noopener"
          >
            <button class="icon">
              <svg
                class="material-icons"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  d="M12 0c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm8.003 8.657c-1.276-3.321-4.46-4.605-5.534-4.537 3.529 1.376 4.373 6.059 4.06 7.441-.307-1.621-1.286-3.017-1.872-3.385 3.417 8.005-4.835 10.465-7.353 7.687.649.168 1.931.085 2.891-.557.898-.602.983-.638 1.56-.683.686-.053-.041-1.406-1.539-1.177-.616.094-1.632.819-2.88.341-1.508-.576-1.46-2.634.096-2.015.337-.437.088-1.263.088-1.263.452-.414 1.022-.706 1.37-.911.228-.135.829-.507.795-1.23-.123-.096-.32-.219-.766-.193-1.736.11-1.852-.518-1.967-.808.078-.668.524-1.534 1.361-1.931-1.257-.193-2.28.397-2.789 1.154-.809-.174-1.305-.183-2.118-.031-.316-.24-.666-.67-.878-1.181 1.832-2.066 4.499-3.378 7.472-3.378 5.912 0 8.263 4.283 8.003 6.657z"
                />
              </svg>
              <span>Firefox</span>
              <span
                class="icon"
                v-if="firefoxExtInstalled"
                v-tooltip="$t('installed')"
              >
                <i class="material-icons">done</i>
              </span>
            </button>
          </a>
        </div>
        <div>
          <a
            href="https://chrome.google.com/webstore/detail/postwoman-extension-for-c/amknoiejhlmhancpahfcfcfhllgkpbld"
            target="_blank"
            rel="noopener"
          >
            <button class="icon">
              <svg
                class="material-icons"
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
              >
                <path
                  d="M2.897 4.181c2.43-2.828 5.763-4.181 9.072-4.181 4.288 0 8.535 2.273 10.717 6.554-2.722.001-6.984 0-9.293 0-1.674.001-2.755-.037-3.926.579-1.376.724-2.415 2.067-2.777 3.644l-3.793-6.596zm5.11 7.819c0 2.2 1.789 3.99 3.988 3.99s3.988-1.79 3.988-3.99-1.789-3.991-3.988-3.991-3.988 1.791-3.988 3.991zm5.536 5.223c-2.238.666-4.858-.073-6.293-2.549-1.095-1.891-3.989-6.933-5.305-9.225-1.33 2.04-1.945 4.294-1.945 6.507 0 5.448 3.726 10.65 9.673 11.818l3.87-6.551zm2.158-9.214c1.864 1.734 2.271 4.542 1.007 6.719-.951 1.641-3.988 6.766-5.46 9.248 7.189.443 12.752-5.36 12.752-11.972 0-1.313-.22-2.66-.69-3.995h-7.609z"
                />
              </svg>
              <span>Chrome</span>
              <span
                class="icon"
                v-if="chromeExtInstalled"
                v-tooltip="$t('installed')"
              >
                <i class="material-icons">done</i>
              </span>
            </button>
          </a>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
    <modal v-if="showShortcuts" @close="showShortcuts = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("shortcuts") }}</h3>
              <div>
                <button class="icon" @click="showShortcuts = false">
                  <i class="material-icons">close</i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <div>
          <label>{{ $t("send_request") }}</label>
          <kbd>⌘ G</kbd>
        </div>
        <div>
          <label>{{ $t("save_to_collections") }}</label>
          <kbd>⌘ S</kbd>
        </div>
        <div>
          <label>{{ $t("copy_request_link") }}</label>
          <kbd>⌘ K</kbd>
        </div>
        <div>
          <label>{{ $t("reset_request") }}</label>
          <kbd>⌘ L</kbd>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
    <modal v-if="showSupport" @close="showSupport = false">
      <div slot="header">
        <ul>
          <li>
            <div class="flex-wrap">
              <h3 class="title">{{ $t("support_us_on") }}</h3>
              <div>
                <button class="icon" @click="showSupport = false">
                  <i class="material-icons">close</i>
                </button>
              </div>
            </div>
          </li>
        </ul>
      </div>
      <div slot="body">
        <p class="info">
          {{ $t("donate_info1") }}
        </p>
        <p class="info">
          {{ $t("donate_info2") }}
        </p>
        <div>
          <a
            href="https://opencollective.com/postwoman"
            target="_blank"
            rel="noopener"
            v-tooltip.right="$t('one_time_recurring')"
          >
            <button class="icon">
              <i class="material-icons">donut_large</i>
              <span>{{ $t("open_collective") }}</span>
            </button>
          </a>
        </div>
        <div>
          <a
            href="https://www.paypal.me/liyascthomas"
            target="_blank"
            rel="noopener"
            v-tooltip.right="$t('one_time')"
          >
            <button class="icon">
              <i class="material-icons">payment</i>
              <span>{{ $t("paypal") }}</span>
            </button>
          </a>
        </div>
        <div>
          <a
            href="https://www.patreon.com/liyasthomas"
            target="_blank"
            rel="noopener"
            v-tooltip.right="$t('recurring')"
          >
            <button class="icon">
              <i class="material-icons">local_parking</i>
              <span>{{ $t("patreon") }}</span>
            </button>
          </a>
        </div>
      </div>
      <div slot="footer"></div>
    </modal>
  </div>
</template>

<style scoped lang="scss">
.link {
  margin: 8px 16px;
}
@media (max-width: 768px) {
  .link {
    display: flex;
    flex: 1;
  }
}
</style>

<script>
import intializePwa from "../assets/js/pwa";
import * as version from "../.postwoman/version.json";
import { hasChromeExtensionInstalled } from "../functions/strategies/ChromeStrategy";
import firebase from "firebase/app";
import { fb } from "../functions/fb";

export default {
  components: {
    logo: () => import("../components/logo"),
    modal: () => import("../components/modal"),
    login: () => import("../components/firebase/login")
  },

  methods: {
    linkActive(path) {
      return {
        "nuxt-link-exact-active": this.$route.path === path,
        "nuxt-link-active": this.$route.path === path
      };
    },

    logout() {
      fb.currentUser = null;
      firebase
        .auth()
        .signOut()
        .catch(err => {
          this.$toast.show(err.message || err, {
            icon: "error"
          });
        });
      this.$toast.info(this.$t("logged_out"), {
        icon: "vpn_key"
      });
    }
  },

  data() {
    return {
      // Once the PWA code is initialized, this holds a method
      // that can be called to show the user the installation
      // prompt.
      showInstallPrompt: null,
      version: {},
      showExtensions: false,
      showShortcuts: false,
      showSupport: false,
      firefoxExtInstalled: window.firefoxExtSendRequest,
      chromeExtInstalled: window.chrome && hasChromeExtensionInstalled(),
      fb
    };
  },

  beforeMount() {
    // Set version data
    this.version = version.default;

    // Load theme settings
    (() => {
      // Apply theme from settings.
      document.documentElement.className =
        this.$store.state.postwoman.settings.THEME_CLASS || "";
      // Load theme color data from settings, or use default color.
      let color = this.$store.state.postwoman.settings.THEME_COLOR || "#50fa7b";
      let vibrant =
        this.$store.state.postwoman.settings.THEME_COLOR_VIBRANT || true;
      document.documentElement.style.setProperty("--ac-color", color);
      document.documentElement.style.setProperty(
        "--act-color",
        vibrant ? "rgba(32, 33, 36, 1)" : "rgba(255, 255, 255, 1)"
      );
    })();
  },

  mounted() {
    if (process.client) {
      document.body.classList.add("afterLoad");
    }

    document
      .querySelector("meta[name=theme-color]")
      .setAttribute(
        "content",
        this.$store.state.postwoman.settings.THEME_TAB_COLOR || "#202124"
      );

    // Initializes the PWA code - checks if the app is installed,
    // etc.
    (async () => {
      this.showInstallPrompt = await intializePwa();
      let cookiesAllowed = localStorage.getItem("cookiesAllowed") === "yes";
      if (!cookiesAllowed) {
        this.$toast.show(this.$t("we_use_cookies"), {
          icon: "info",
          duration: 5000,
          theme: "toasted-primary",
          action: [
            {
              text: this.$t("dismiss"),
              onClick: (e, toastObject) => {
                localStorage.setItem("cookiesAllowed", "yes");
                toastObject.goAway(0);
              }
            }
          ]
        });
      }
      let showExtensionsToast =
        localStorage.getItem("showExtensionsToast") === "yes";
      if (
        !this.firefoxExtInstalled &&
        !this.chromeExtInstalled &&
        !showExtensionsToast
      ) {
        setTimeout(() => {
          this.$toast.show(this.$t("extensions_info2"), {
            icon: "extension",
            duration: 5000,
            theme: "toasted-primary",
            action: [
              {
                text: this.$t("yes"),
                onClick: (e, toastObject) => {
                  this.showExtensions = true;
                  localStorage.setItem("showExtensionsToast", "yes");
                  toastObject.goAway(0);
                }
              },
              {
                text: this.$t("no"),
                onClick: (e, toastObject) => {
                  toastObject.goAway(0);
                }
              }
            ]
          });
        }, 15000);
      }
    })();

    window.addEventListener("scroll", event => {
      let mainNavLinks = document.querySelectorAll("nav ul li a");
      let fromTop = window.scrollY;
      mainNavLinks.forEach(link => {
        let section = document.querySelector(link.hash);

        if (
          section &&
          section.offsetTop <= fromTop &&
          section.offsetTop + section.offsetHeight > fromTop
        ) {
          link.classList.add("current");
        } else {
          link.classList.remove("current");
        }
      });
    });

    console.log(
      "%cWe ❤︎ open source!",
      "background-color:white;padding:8px 16px;border-radius:8px;font-size:32px;color:red;"
    );
    console.log(
      "%cContribute: https://github.com/liyasthomas/postwoman",
      "background-color:black;padding:4px 8px;border-radius:8px;font-size:16px;color:white;"
    );
  },

  watch: {
    $route() {
      // this.$toast.clear();
    }
  },

  computed: {
    availableLocales() {
      return this.$i18n.locales.filter(i => i.code !== this.$i18n.locale);
    }
  }
};
</script>
