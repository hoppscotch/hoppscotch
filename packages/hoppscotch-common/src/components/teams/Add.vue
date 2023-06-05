<template>
  <HoppSmartModal v-if="show" dialog :title="t('team.new')" @close="hideModal">
    <template #body>
      <HoppSmartInput
        v-model="name"
        :label="t('action.label')"
        placeholder=" "
        input-styles="floating-input"
        @submit="addNewTeam"
      />
    </template>
    <template #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          :label="t('action.save')"
          :loading="isLoading"
          outline
          @click="addNewTeam"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="hideModal"
        />
      </span>
    </template>
  </HoppSmartModal>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { pipe } from "fp-ts/function"
import * as TE from "fp-ts/TaskEither"
import { createTeam } from "~/helpers/backend/mutations/Team"
import { TeamNameCodec } from "~/helpers/backend/types/TeamName"
import { useI18n } from "@composables/i18n"
import { useToast } from "@composables/toast"
import { platform } from "~/platform"

const t = useI18n()

const toast = useToast()

defineProps<{
  show: boolean
}>()

const emit = defineEmits<{
  (e: "hide-modal"): void
}>()

const name = ref<string | null>(null)

const isLoading = ref(false)

const addNewTeam = async () => {
  isLoading.value = true
  await pipe(
    TeamNameCodec.decode(name.value),
    TE.fromEither,
    TE.mapLeft(() => "invalid_name" as const),
    TE.chainW(createTeam),
    TE.chainFirstIOK(
      () => () =>
        platform.analytics?.logEvent({
          type: "HOPP_CREATE_TEAM",
        })
    ),
    TE.match(
      (err) => {
        // err is of type "invalid_name" | GQLError<Err>
        if (err === "invalid_name") {
          toast.error(`${t("team.name_length_insufficient")}`)
        } else {
          // Handle GQL errors (use err obj)
        }
      },
      () => {
        toast.success(`${t("team.new_created")}`)
        hideModal()
      }
    )
  )()
  isLoading.value = false
}

const hideModal = () => {
  name.value = null
  emit("hide-modal")
}
</script>
