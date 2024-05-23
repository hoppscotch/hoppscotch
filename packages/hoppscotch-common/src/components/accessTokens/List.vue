<template>
  <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
    <div
      v-for="{ id, label, lastUsedOn, expiresOn } in accessTokens"
      :key="id"
      class="flex items-center justify-between p-4 border rounded md:items-baseline md:flex-col md:gap-4 md:justify-normal border-divider"
    >
      <div class="w-full text-sm font-semibold truncate text-secondaryDark">
        {{ label }}
      </div>

      <div class="flex items-center gap-x-4">
        <div class="space-y-1 text-secondaryLight">
          <div class="space-x-1">
            <span class="font-semibold"
              >{{ t("access_tokens.last_used_on") }}:</span
            >
            <span>
              {{ shortDateTime(lastUsedOn, false) }}
            </span>
          </div>

          <div class="space-x-1">
            <span class="font-semibold"
              >{{ t("access_tokens.expires_on") }}:</span
            >
            <span>
              {{
                expiresOn
                  ? shortDateTime(expiresOn, false)
                  : t("access_tokens.no_expiration")
              }}
            </span>
          </div>
        </div>

        <HoppButtonSecondary
          :label="t('action.delete')"
          filled
          outline
          @click="
            emit('delete-access-token', {
              tokenId: id,
              tokenLabel: label,
            })
          "
        />
      </div>
    </div>
  </div>

  <HoppSmartIntersection
    v-if="hasMoreTokens"
    @intersecting="emit('fetch-more-tokens')"
  >
    <div v-if="tokensListLoading" class="flex flex-col items-center py-3">
      <HoppSmartSpinner />
    </div>
  </HoppSmartIntersection>
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { shortDateTime } from "~/helpers/utils/date"
import { AccessToken } from "~/pages/profile.vue"

const t = useI18n()

defineProps<{
  accessTokens: AccessToken[]
  hasMoreTokens: boolean
  tokensListLoading: boolean
}>()

const emit = defineEmits<{
  (e: "fetch-more-tokens"): void
  (
    e: "delete-access-token",
    { tokenId, tokenLabel }: { tokenId: string; tokenLabel: string }
  ): void
}>()
</script>
