<template>
  <div class="flex justify-center items-center">
    <HoppSmartSpinner />
  </div>
</template>

<script setup lang="ts">
import { handleOAuthRedirect } from "~/helpers/oauth"
import { useToast } from "~/composables/toast"

import * as E from "fp-ts/Either"
import { useService } from "dioc/vue"
import { RESTTabService } from "~/services/tab/rest"
import { onMounted } from "vue"

import { useRouter } from "vue-router"

const router = useRouter()

const toast = useToast()

const tabs = useService(RESTTabService)

onMounted(async () => {
  const tokenInfo = await handleOAuthRedirect()

  if (E.isLeft(tokenInfo)) {
    toast.error(tokenInfo.left)
    router.push("/")
    return
  }

  if (
    tabs.currentActiveTab.value.document.request.auth.authType === "oauth-2"
  ) {
    tabs.currentActiveTab.value.document.request.auth.token =
      tokenInfo.right.access_token

    router.push("/")
    return
  }
})
</script>
