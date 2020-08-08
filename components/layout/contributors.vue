<template>
  <div>
    <p class="info">
      {{ $t("donate_info1") }}
    </p>
    <p class="info">
      {{ $t("donate_info2") }}
    </p>
    <div class="flex-wrap">
      <span>
        <a
          href="https://github.com/sponsors/postwoman-io"
          target="_blank"
          rel="noopener"
          v-tooltip.right="$t('recurring')"
        >
          <button class="icon">
            <icon :icon="'github'" />
            <span>GitHub Sponsors</span>
          </button>
        </a>
      </span>
    </div>
    <div class="flex-wrap">
      <span>
        <a
          href="https://opencollective.com/postwoman"
          target="_blank"
          rel="noopener"
          v-tooltip.right="$t('one_time_recurring')"
        >
          <button class="icon">
            <icon :icon="'donut_large'" />
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
          <icon :icon="'local_parking'" />
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
          <icon :icon="'payment'" />
          <span>{{ $t("paypal") }}</span>
        </button>
      </a>
    </div>
    <hr />
    <h3 class="title">Financial Contributors</h3>
    <p class="info">
      Become a financial contributor and help us sustain our community.
      <a class="link" href="https://opencollective.com/postwoman/contribute">Contribute</a>.
    </p>
    <h3 class="title">Organizations</h3>
    <p class="info">
      Support this project with your organization. Your logo will show up here with a link to your
      website.
      <a class="link" href="https://opencollective.com/postwoman/contribute">Contribute</a>.
    </p>
    <div class="contributors">
      <a href="https://tyk.io" target="_blank" rel="noopener">
        <img
          style="max-width: 320px;"
          src="~assets/images/Tyk-side-project-logo-tagline-blk.png"
          alt="Tyk Banner"
        />
      </a>
    </div>
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
      <a class="link" href="https://opencollective.com/postwoman/contribute">Contribute</a>.
    </p>
    <div class="contributors">
      <a href="http://tom.preston-werner.com" target="_blank" rel="noopener">
        <img
          style="max-width: 64px; max-height: 64px; border-radius: 100%;"
          src="https://github.com/mojombo.png?size=64"
          alt="Tom Preston-Werner"
        />
      </a>
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
  align-items: center;
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
