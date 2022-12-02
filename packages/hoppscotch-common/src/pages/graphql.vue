<template>
  <AppPaneLayout layout-id="graphql">
    <template #primary>
      <GraphqlRequest :conn="gqlConn" />
      <GraphqlRequestOptions :conn="gqlConn" />
    </template>
    <template #secondary>
      <GraphqlResponse :conn="gqlConn" />
    </template>
    <template #sidebar>
      <GraphqlSidebar :conn="gqlConn" />
    </template>
  </AppPaneLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, watch } from "vue"
import { useReadonlyStream } from "@composables/stream"
import { useI18n } from "@composables/i18n"
import { usePageHead } from "@composables/head"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { GQLConnection } from "@helpers/GQLConnection"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const gqlConn = new GQLConnection()
const isLoading = useReadonlyStream(gqlConn.isLoading$, false)

onBeforeUnmount(() => {
  if (gqlConn.connected$.value) {
    gqlConn.disconnect()
  }
})

watch(isLoading, () => {
  if (isLoading.value) startPageProgress()
  else completePageProgress()
})
</script>
