<template>
  <div class="folder">
    <h3>
      <i class="material-icons">folder_open</i>
      {{ folder.name || $t("none") }}
    </h3>
    <div v-for="(folder, index) in folder.folders" :key="index">
      <DocsFolder :folder="folder" />
    </div>
    <div v-for="(request, index) in folder.requests" :key="index">
      <DocsRequest :request="request" />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    folder: Object,
  },
}
</script>

<style lang="scss" scoped>
.folder {
  @apply flex;
  @apply flex-col;
  @apply justify-center;
  @apply flex-1;
  @apply p-4;

  .material-icons {
    @apply mr-4;
  }
}

.folder {
  @apply border-l;
  @apply border-brdColor;
  @apply mt-4;
}
</style>
