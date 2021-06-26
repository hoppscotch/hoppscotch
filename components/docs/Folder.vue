<template>
  <div class="folder">
    <h3 class="heading">
      <i class="material-icons">folder_open</i>
      {{ folder.name || $t("none") }}
    </h3>
    <div v-for="(subFolder, index) in folder.folders" :key="index">
      <DocsFolder :folder="subFolder" />
    </div>
    <div v-for="(request, index) in folder.requests" :key="index">
      <DocsRequest :request="request" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    folder: { type: Object, default: () => {} },
  },
}
</script>

<style lang="scss" scoped>
.folder {
  @apply flex flex-col flex-1;
  @apply justify-center;
  @apply p-4;
  @apply border-l border-divider;
  @apply mt-4;

  .material-icons {
    @apply mr-4;
  }
}
</style>
