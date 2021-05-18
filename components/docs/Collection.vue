<template>
  <div class="collection">
    <h2>
      <i class="material-icons">folder</i>
      {{ collection.name || $t("none") }}
    </h2>
    <span
      v-for="(folder, index) in collection.folders"
      :key="`sub-collection-${index}`"
      class="folder"
    >
      <DocsFolder :folder="folder" />
    </span>
    <div
      v-for="(request, index) in collection.requests"
      :key="`request-${index}`"
    >
      <DocsRequest :request="request" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    collection: { type: Object, default: () => {} },
  },
}
</script>

<style lang="scss" scoped>
.collection {
  @apply flex;
  @apply flex-col;
  @apply justify-center;
  @apply flex-1;
  @apply p-4;

  .material-icons {
    @apply mr-4;
  }
}
</style>
