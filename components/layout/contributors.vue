<template>
  <div>
    <p class="info">
      {{ $t("donate_info1") }}
    </p>
    <p class="info">
      {{ $t("donate_info2") }}
    </p>
    <div class="row-wrapper">
      <span>
        <a
          href="https://github.com/sponsors/hoppscotch"
          target="_blank"
          rel="noopener"
          v-tooltip.right="$t('recurring')"
        >
          <button class="icon">
            <i class="material-icons">
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
            </i>
            <span>GitHub Sponsors</span>
          </button>
        </a>
      </span>
    </div>
    <div class="row-wrapper">
      <span>
        <a
          href="https://opencollective.com/hoppscotch"
          target="_blank"
          rel="noopener"
          v-tooltip.right="$t('one_time_recurring')"
        >
          <button class="icon">
            <i class="material-icons">donut_large</i>
            <span>{{ $t("open_collective") }}</span>
          </button>
        </a>
      </span>
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
    <hr />
    <h3 class="title">Financial Contributors</h3>
    <div class="contributors">
      <a href="https://tyk.io" target="_blank" rel="noopener">
        <img
          style="max-width: 320px"
          src="~assets/images/Tyk-side-project-logo-tagline-blk.png"
          alt="Tyk Banner"
        />
      </a>
    </div>
    <div class="contributors">
      <a
        target="_blank"
        rel="noopener"
        href="https://opencollective.com/hoppscotch/organization/0/website"
      >
        <img src="https://opencollective.com/hoppscotch/organization/0/avatar.svg" />
      </a>
      <a
        target="_blank"
        rel="noopener"
        href="https://opencollective.com/hoppscotch/organization/1/website"
      >
        <img src="https://opencollective.com/hoppscotch/organization/1/avatar.svg" />
      </a>
    </div>
    <div class="contributors">
      <a
        v-for="sponsor in githubSponsors"
        :key="sponsor.handle"
        :href="sponsor.profile"
        target="_blank"
        rel="noopener"
      >
        <img
          class="github-sponsor"
          :src="`${sponsor.profile}.png?size=128`"
          :alt="sponsor.handle"
        />
      </a>
    </div>
    <h3 class="title">Code Contributors</h3>
    <p class="info">This project exists thanks to all the people who contribute.</p>
    <div class="contributors">
      <a
        target="_blank"
        rel="noopener"
        href="https://github.com/liyasthomas/hoppscotch/graphs/contributors"
      >
        <img src="https://opencollective.com/hoppscotch/contributors.svg" />
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contributors {
  @apply flex;
  @apply items-center;
  @apply flex-no-wrap;
  @apply overflow-auto;
  @apply my-4;
}

.github-sponsor {
  @apply mr-2;
  @apply rounded-full;
}
</style>

<script>
export default {
  data() {
    return {
      githubSponsors: [],
    }
  },
  async mounted() {
    this.githubSponsors = await this.$axios
      .$get("https://sponsors.trnck.dev/hoppscotch/sponsors")
      .then((data) => data.sponsors)
  },
}
</script>
