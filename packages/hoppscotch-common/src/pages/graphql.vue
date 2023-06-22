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
import { usePageHead } from "@composables/head"
import { useI18n } from "@composables/i18n"
import { GQLConnection } from "@helpers/GQLConnection"
import { computed, onBeforeUnmount } from "vue"

const t = useI18n()

usePageHead({
  title: computed(() => t("navigation.graphql")),
})

const gqlConn = new GQLConnection()

onBeforeUnmount(() => {
  if (gqlConn.connected$.value) {
    gqlConn.disconnect()
  }
})
</script>
