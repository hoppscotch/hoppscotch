<template>
  <AccessTokensOverview
    @show-access-tokens-generate-modal="showAccessTokensGenerateModal = true"
  />

  <AccessTokensList
    :access-tokens="accessTokens"
    :has-error="tokensListFetchErrored"
    :has-more-tokens="hasMoreTokens"
    :loading="tokensListLoading"
    @delete-access-token="displayDeleteAccessTokenConfirmationModal"
    @fetch-more-tokens="fetchAccessTokens"
  />

  <AccessTokensGenerateModal
    v-if="showAccessTokensGenerateModal"
    :access-token="accessToken"
    :token-generate-action-loading="tokenGenerateActionLoading"
    @generate-access-token="generateAccessToken"
    @hide-modal="hideAccessTokenGenerateModal"
  />

  <HoppSmartConfirmModal
    :show="confirmDeleteAccessToken"
    :loading-state="tokenDeleteActionLoading"
    :title="
      t('confirm.delete_access_token', { tokenLabel: tokenToDelete?.label })
    "
    @hide-modal="confirmDeleteAccessToken = false"
    @resolve="deleteAccessToken"
  />
</template>

<script setup lang="ts">
import axios from "axios"
import { Ref, onMounted, ref } from "vue"
import { platform } from "~/platform"

import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"

export type AccessToken = {
  id: string
  label: string
  createdOn: string
  lastUsedOn: string
  expiresOn: string | null
}

const t = useI18n()
const toast = useToast()

const confirmDeleteAccessToken = ref(false)
const hasMoreTokens = ref(false)
const showAccessTokensGenerateModal = ref(false)
const tokenDeleteActionLoading = ref(false)
const tokenGenerateActionLoading = ref(false)
const tokensListFetchErrored = ref(false)
const tokensListLoading = ref(false)

const accessToken: Ref<string | null> = ref(null)
const tokenToDelete = ref<{ id: string; label: string } | null>(null)

const accessTokens: Ref<AccessToken[]> = ref([])

const limit = 12
let offset = 0

const endpointPrefix = `${import.meta.env.VITE_BACKEND_API_URL}/access-tokens`

const getAxiosPlatformConfig = async () => {
  await platform.auth.waitProbableLoginToConfirm()
  return platform.auth.axiosPlatformConfig?.() ?? {}
}

onMounted(async () => {
  await fetchAccessTokens()
})

const fetchAccessTokens = async () => {
  tokensListLoading.value = true

  const axiosConfig = await getAxiosPlatformConfig()
  const endpoint = `${endpointPrefix}/list?offset=${offset}&limit=${limit}`

  try {
    const { data } = await axios.get(endpoint, axiosConfig)

    accessTokens.value.push(...data)

    if (data.length > 0) {
      offset += data.length
    }

    hasMoreTokens.value = data.length === limit

    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false
    }
  } catch (err) {
    toast.error(t("error.fetching_access_tokens_list"))
    tokensListFetchErrored.value = true
  } finally {
    tokensListLoading.value = false
  }
}

const generateAccessToken = async ({
  label,
  expiryInDays,
}: {
  label: string
  expiryInDays: number | null
}) => {
  tokenGenerateActionLoading.value = true

  const axiosConfig = await getAxiosPlatformConfig()
  const endpoint = `${endpointPrefix}/create`

  const body = {
    label,
    expiryInDays,
  }

  try {
    const { data }: { data: { token: string; info: AccessToken } } =
      await axios.post(endpoint, body, axiosConfig)

    accessTokens.value.unshift(data.info)
    accessToken.value = data.token

    // Incrementing the offset value by 1 to account for the newly generated token
    offset += 1

    // Toggle the error state in case it was set
    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false
    }
  } catch (err) {
    toast.error(t("error.generate_access_token"))
    showAccessTokensGenerateModal.value = false
  } finally {
    tokenGenerateActionLoading.value = false
  }
}

const deleteAccessToken = async () => {
  if (tokenToDelete.value === null) {
    toast.error(t("error.something_went_wrong"))
    return
  }

  const { id: tokenIdToDelete, label: tokenLabelToDelete } = tokenToDelete.value

  tokenDeleteActionLoading.value = true

  const axiosConfig = await getAxiosPlatformConfig()
  const endpoint = `${endpointPrefix}/revoke?id=${tokenIdToDelete}`

  try {
    await axios.delete(endpoint, axiosConfig)

    accessTokens.value = accessTokens.value.filter(
      (token) => token.id !== tokenIdToDelete
    )

    // Decreasing the offset value by 1 to account for the deleted token
    offset = offset > 0 ? offset - 1 : offset

    toast.success(
      t("access_tokens.deletion_success", { label: tokenLabelToDelete })
    )

    // Toggle the error state in case it was set
    if (tokensListFetchErrored.value) {
      tokensListFetchErrored.value = false
    }
  } catch (err) {
    toast.error(t("error.delete_access_token"))
  } finally {
    tokenDeleteActionLoading.value = false
    confirmDeleteAccessToken.value = false

    tokenToDelete.value = null
  }
}

const hideAccessTokenGenerateModal = () => {
  // Reset the reactive state variable holding access token value and hide the modal
  accessToken.value = null
  showAccessTokensGenerateModal.value = false
}

const displayDeleteAccessTokenConfirmationModal = ({
  tokenId,
  tokenLabel,
}: {
  tokenId: string
  tokenLabel: string
}) => {
  confirmDeleteAccessToken.value = true

  tokenToDelete.value = {
    id: tokenId,
    label: tokenLabel,
  }
}
</script>
