<template>
  <AppPaneLayout>
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
import { onBeforeUnmount, watch } from "vue"
import { useReadonlyStream } from "@composables/stream"
import { startPageProgress, completePageProgress } from "@modules/loadingbar"
import { GQLConnection } from "@helpers/GQLConnection"

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
