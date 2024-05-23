<template>
  <AccessTokensOverview
    @show-access-tokens-generate-modal="showAccessTokensGenerateModal = true"
  />

  <AccessTokensList
    :access-tokens="accessTokens"
    :has-more-tokens="hasMoreTokens"
    :tokens-list-loading="tokensListLoading"
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
    @resolve="() => deleteAccessToken()"
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
  createdOn: Date
  lastUsedOn: Date
  expiresOn: Date | null
}

const t = useI18n()
const toast = useToast()

const confirmDeleteAccessToken = ref(false)
const hasMoreTokens = ref(true)
const showAccessTokensGenerateModal = ref(false)
const tokenDeleteActionLoading = ref(false)
const tokenGenerateActionLoading = ref(false)
const tokensListLoading = ref(false)

const accessToken: Ref<string | null> = ref(null)
const tokenToDelete = ref<{ id: string; label: string } | null>(null)

const accessTokens: Ref<AccessToken[]> = ref([])

const limit = 12
let offset = 0

const accessTokenEndpointMetadata = {
  axiosPlatformConfig: platform.auth.axiosPlatformConfig?.() ?? {},
  endpointPrefix: `${import.meta.env.VITE_BACKEND_API_URL}/access-tokens`,
}

onMounted(async () => {
  await fetchAccessTokens()
})

const fetchAccessTokens = async () => {
  tokensListLoading.value = true

  const { axiosPlatformConfig, endpointPrefix } = accessTokenEndpointMetadata

  const endpoint = `${endpointPrefix}/list?offset=${offset}&limit=${limit}`

  try {
    const { data } = await axios.get(endpoint, axiosPlatformConfig)

    accessTokens.value.push(...data)

    if (data.length > 0) {
      offset += data.length
    }

    hasMoreTokens.value = data.length === limit
  } catch (err) {
    toast.error(t("error.fetching_access_tokens_list"))
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

  const { axiosPlatformConfig, endpointPrefix } = accessTokenEndpointMetadata

  const endpoint = `${endpointPrefix}/create`

  const body = {
    label,
    expiryInDays,
  }

  try {
    const { data }: { data: { token: string; info: AccessToken } } =
      await axios.post(endpoint, body, axiosPlatformConfig)

    accessTokens.value.unshift(data.info)
    accessToken.value = data.token

    // Incrementing the offset value by 1 to account for the newly generated token
    offset += 1
  } catch (err) {
    toast.error(t("error.generate_access_token"))
  } finally {
    tokenGenerateActionLoading.value = false
  }
}

const deleteAccessToken = async () => {
  if (tokenToDelete.value === null) {
    toast.error("error.something_went_wrong")
    return
  }

  const { id: tokenIdToDelete } = tokenToDelete.value

  tokenDeleteActionLoading.value = true

  const { axiosPlatformConfig, endpointPrefix } = accessTokenEndpointMetadata

  const endpoint = `${endpointPrefix}/revoke?id=${tokenIdToDelete}`

  try {
    await axios.delete(endpoint, axiosPlatformConfig)

    accessTokens.value = accessTokens.value.filter(
      (token) => token.id !== tokenIdToDelete
    )

    // Decreasing the offset value by 1 to account for the deleted token
    offset = offset > 0 ? offset - 1 : offset
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
