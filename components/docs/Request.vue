<template>
  <div class="request">
    <h4>
      <i class="material-icons">insert_drive_file</i>
      {{ request.name || $t("none") }}
    </h4>
    <p class="doc-desc" v-if="request.url">
      <span>
        {{ $t("url") }}: <code>{{ request.url || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.path">
      <span>
        {{ $t("path") }}:
        <code>{{ request.path || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.method">
      <span>
        {{ $t("method") }}:
        <code>{{ request.method || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.auth">
      <span>
        {{ $t("authentication") }}:
        <code>{{ request.auth || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.httpUser">
      <span>
        {{ $t("username") }}:
        <code>{{ request.httpUser || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.httpPassword">
      <span>
        {{ $t("password") }}:
        <code>{{ request.httpPassword || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.bearerToken">
      <span>
        {{ $t("token") }}:
        <code>{{ request.bearerToken || $t("none") }}</code>
      </span>
    </p>
    <h4 v-if="request.headers">{{ $t("headers") }}</h4>
    <span v-if="request.headers">
      <p v-for="header in request.headers" :key="header.key" class="doc-desc">
        <span>
          {{ header.key || $t("none") }}:
          <code>{{ header.value || $t("none") }}</code>
        </span>
      </p>
    </span>
    <h4 v-if="request.params">{{ $t("parameters") }}</h4>
    <span v-if="request.params">
      <p v-for="parameter in request.params" :key="parameter.key" class="doc-desc">
        <span>
          {{ parameter.key || $t("none") }}:
          <code>{{ parameter.value || $t("none") }}</code>
        </span>
      </p>
    </span>
    <h4 v-if="request.bodyParams">{{ $t("payload") }}</h4>
    <span v-if="request.bodyParams">
      <p v-for="payload in request.bodyParams" :key="payload.key" class="doc-desc">
        <span>
          {{ payload.key || $t("none") }}:
          <code>{{ payload.value || $t("none") }}</code>
        </span>
      </p>
    </span>
    <p class="doc-desc" v-if="request.rawParams">
      <span>
        {{ $t("parameters") }}:
        <code>{{ request.rawParams || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.contentType">
      <span>
        {{ $t("content_type") }}:
        <code>{{ request.contentType || $t("none") }}</code>
      </span>
    </p>
    <p class="doc-desc" v-if="request.requestType">
      <span>
        {{ $t("request_type") }}:
        <code>{{ request.requestType || $t("none") }}</code>
      </span>
    </p>
  </div>
</template>

<script>
export default {
  props: {
    request: Object,
  },
}
</script>

<style scoped lang="scss">
.request {
  @apply flex;
  @apply flex-col;
  @apply justify-center;
  @apply flex-1;
  @apply p-4;

  .material-icons {
    @apply mr-4;
  }
}
.request {
  @apply border;
  @apply border-brdColor;
  @apply rounded-lg;
  @apply mt-4;

  h4 {
    @apply mt-4;
  }
}

.doc-desc {
  @apply flex;
  @apply flex-col;
  @apply justify-center;
  @apply flex-1;
  @apply p-4;

  .material-icons {
    @apply mr-4;
  }
}

.doc-desc {
  @apply text-fgLightColor;
  @apply border-b;
  @apply border-dashed;
  @apply border-brdColor;
  @apply m-0;

  &:last-child {
    @apply border-b-0;
  }
}
</style>
