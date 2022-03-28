<template>
  <div class="folder">
    <h3 class="heading">
      <SmartIcon name="folder-open" class="svg-icons" />
      {{ folder.name || $t("state.none") }}
    </h3>
    <div
      v-for="(subFolder, index) in folder.folders"
      :key="`subFolder-${index}`"
    >
      <DocsFolder :folder="subFolder" />
    </div>
    <div v-for="(request, index) in folder.requests" :key="`request-${index}`">
      <DocsRequest :request="request" />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"

export default defineComponent({
  props: {
    folder: { type: Object, default: () => {} },
  },
})
</script>

<style scoped lang="scss">
.folder {
  @apply flex flex-col flex-1;
  @apply justify-center;
  @apply p-4;
  @apply mt-4;
  @apply border-l border-divider;

  .material-icons {
    @apply mr-4;
  }
}
</style>
