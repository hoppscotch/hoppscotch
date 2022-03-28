<template>
  <div class="request">
    <h4 class="heading">
      <SmartIcon name="file" class="svg-icons" />
      {{ request.name || $t("state.none") }}
    </h4>
    <p v-if="request.url" class="doc-desc">
      <span>
        {{ $t("request.url") }}:
        <code>{{ request.url || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.path" class="doc-desc">
      <span>
        {{ $t("request.path") }}:
        <code>{{ request.path || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.method" class="doc-desc">
      <span>
        {{ $t("request.method") }}:
        <code>{{ request.method || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.auth" class="doc-desc">
      <span>
        {{ $t("request.authorization") }}:
        <code>{{ request.auth.authType || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.httpUser" class="doc-desc">
      <span>
        {{ $t("authorization.username") }}:
        <code>{{ request.httpUser || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.httpPassword" class="doc-desc">
      <span>
        {{ $t("authorization.password") }}:
        <code>{{ request.httpPassword || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.bearerToken" class="doc-desc">
      <span>
        {{ $t("authorization.token") }}:
        <code>{{ request.bearerToken || $t("state.none") }}</code>
      </span>
    </p>
    <h4 v-if="request.headers" class="heading">{{ $t("tab.headers") }}</h4>
    <span v-if="request.headers">
      <p
        v-for="(header, index) in request.headers"
        :key="`header-${index}`"
        class="doc-desc"
      >
        <span>
          {{ header.key || $t("state.none") }}:
          <code>{{ header.value || $t("state.none") }}</code>
        </span>
      </p>
    </span>
    <h4 v-if="request.params" class="heading">
      {{ $t("request.parameters") }}
    </h4>
    <span v-if="request.params">
      <p
        v-for="(parameter, index) in request.params"
        :key="`parameter-${index}`"
        class="doc-desc"
      >
        <span>
          {{ parameter.key || $t("state.none") }}:
          <code>{{ parameter.value || $t("state.none") }}</code>
        </span>
      </p>
    </span>
    <h4 v-if="request.bodyParams" class="heading">
      {{ $t("request.payload") }}
    </h4>
    <span v-if="request.bodyParams">
      <p
        v-for="(payload, index) in request.bodyParams"
        :key="`payload-${index}`"
        class="doc-desc"
      >
        <span>
          {{ payload.key || $t("state.none") }}:
          <code>{{ payload.value || $t("state.none") }}</code>
        </span>
      </p>
    </span>
    <p v-if="request.rawParams" class="doc-desc">
      <span>
        {{ $t("request.parameters") }}:
        <code>{{ request.rawParams || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.contentType" class="doc-desc">
      <span>
        {{ $t("request.content_type") }}:
        <code>{{ request.contentType || $t("state.none") }}</code>
      </span>
    </p>
    <p v-if="request.requestType" class="doc-desc">
      <span>
        {{ $t("request.type") }}:
        <code>{{ request.requestType || $t("state.none") }}</code>
      </span>
    </p>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    request: { type: Object, default: () => {} },
  },
})
</script>

<style scoped lang="scss">
.request {
  @apply flex flex-col flex-1;
  @apply justify-center;
  @apply p-4;
  @apply mt-4;
  @apply border border-divider;
  @apply rounded;

  h4 {
    @apply mt-4;
  }

  .material-icons {
    @apply mr-4;
  }
}

.doc-desc {
  @apply flex flex-col flex-1;
  @apply justify-center;
  @apply p-4;
  @apply m-0;
  @apply text-secondaryLight;
  @apply border-b border-divider;

  &:last-child {
    @apply border-b-0;
  }

  .material-icons {
    @apply mr-4;
  }
}
</style>
