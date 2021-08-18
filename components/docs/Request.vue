<template>
  <div class="request">
    <h4 class="heading">
      <i class="material-icons">insert_drive_file</i>
      {{ request.name || $t("none") }}
    </h4>
    <p v-if="request.url" class="doc-desc">
      <span>
        {{ $t("request.url") }}: <code>{{ request.url || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.path" class="doc-desc">
      <span>
        {{ $t("request.path") }}:
        <code>{{ request.path || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.method" class="doc-desc">
      <span>
        {{ $t("request.method") }}:
        <code>{{ request.method || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.auth" class="doc-desc">
      <span>
        {{ $t("authentication") }}:
        <code>{{ request.auth || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.httpUser" class="doc-desc">
      <span>
        {{ $t("username") }}:
        <code>{{ request.httpUser || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.httpPassword" class="doc-desc">
      <span>
        {{ $t("password") }}:
        <code>{{ request.httpPassword || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.bearerToken" class="doc-desc">
      <span>
        {{ $t("token") }}:
        <code>{{ request.bearerToken || $t("none") }}</code>
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
          {{ header.key || $t("none") }}:
          <code>{{ header.value || $t("none") }}</code>
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
          {{ parameter.key || $t("none") }}:
          <code>{{ parameter.value || $t("none") }}</code>
        </span>
      </p>
    </span>
    <h4 v-if="request.bodyParams" class="heading">{{ $t("payload") }}</h4>
    <span v-if="request.bodyParams">
      <p
        v-for="(payload, index) in request.bodyParams"
        :key="`payload-${index}`"
        class="doc-desc"
      >
        <span>
          {{ payload.key || $t("none") }}:
          <code>{{ payload.value || $t("none") }}</code>
        </span>
      </p>
    </span>
    <p v-if="request.rawParams" class="doc-desc">
      <span>
        {{ $t("request.parameters") }}:
        <code>{{ request.rawParams || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.contentType" class="doc-desc">
      <span>
        {{ $t("request.content_type") }}:
        <code>{{ request.contentType || $t("none") }}</code>
      </span>
    </p>
    <p v-if="request.requestType" class="doc-desc">
      <span>
        {{ $t("request.type") }}:
        <code>{{ request.requestType || $t("none") }}</code>
      </span>
    </p>
  </div>
</template>

<script>
export default {
  props: {
    request: { type: Object, default: () => {} },
  },
}
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
