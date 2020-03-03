<template>
  <div>
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
    <hr />
    <h3 class="title">Financial Contributors</h3>
    <p class="info">
      Become a financial contributor and help us sustain our community.
      <a class="link" href="https://opencollective.com/postwoman/contribute">[Contribute]</a>.
    </p>
    <h3 class="title">Organizations</h3>
    <p class="info">
      Support this project with your organization. Your logo will show up here with a link to your
      website.
      <a class="link" href="https://opencollective.com/postwoman/contribute">[Contribute]</a>.
    </p>
    <div class="contributors">
      <a href="https://opencollective.com/postwoman/organization/0/website">
        <img src="https://opencollective.com/postwoman/organization/0/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/1/website">
        <img src="https://opencollective.com/postwoman/organization/1/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/2/website">
        <img src="https://opencollective.com/postwoman/organization/2/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/3/website">
        <img src="https://opencollective.com/postwoman/organization/3/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/4/website">
        <img src="https://opencollective.com/postwoman/organization/4/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/5/website">
        <img src="https://opencollective.com/postwoman/organization/5/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/6/website">
        <img src="https://opencollective.com/postwoman/organization/6/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/7/website">
        <img src="https://opencollective.com/postwoman/organization/7/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/8/website">
        <img src="https://opencollective.com/postwoman/organization/8/avatar.svg" />
      </a>
      <a href="https://opencollective.com/postwoman/organization/9/website">
        <img src="https://opencollective.com/postwoman/organization/9/avatar.svg" />
      </a>
    </div>
    <h3 class="title">Individuals</h3>
    <p class="info">
      Support this project with your organization. Your logo will show up here with a link to your
      website.
      <a class="link" href="https://opencollective.com/postwoman/contribute">[Contribute]</a>.
    </p>
    <div class="contributors">
      <a href="https://opencollective.com/postwoman">
        <img src="https://opencollective.com/postwoman/individuals.svg" />
      </a>
    </div>
    <h3 class="title">Code Contributors</h3>
    <p class="info">
      This project exists thanks to all the people who contribute.
    </p>
    <div class="contributors">
      <a href="https://github.com/liyasthomas/postwoman/graphs/contributors">
        <img src="https://opencollective.com/postwoman/contributors.svg" />
      </a>
    </div>
  </div>
</template>

<style scoped lang="scss">
.contributors {
  display: flex;
  flex-flow: row nowrap;
  overflow: auto;
  padding: 8px 0;
  margin: 8px 0;
  max-width: calc(100vw - 72px);
}
</style>

<script>
export default {}
</script>
