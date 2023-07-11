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
import { cloneDeep } from "lodash-es"
import { computed, onBeforeUnmount } from "vue"
import { defineActionHandler } from "~/helpers/actions"
import { getGQLSession, setGQLSession } from "~/newstore/GQLSession"

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

defineActionHandler("gql.request.open", ({ request }) => {
  const session = getGQLSession()

  setGQLSession({
    request: cloneDeep(request),
    schema: session.schema,
    response: session.response,
  })
})
</script>
