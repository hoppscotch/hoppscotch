<template>
  <div class="grid grid-cols-1">
    <section class="p-4">
      <h4 class="font-semibold text-secondaryDark">
        {{ t("settings.profile") }}
      </h4>
      <div class="my-1 text-secondaryLight">
        {{ t("settings.profile_description") }}
      </div>
      <div class="py-4">
        <label for="displayName">
          {{ t("settings.profile_name") }}
        </label>
        <HoppSmartInput
          v-model="displayName"
          :autofocus="false"
          styles="mt-2 md:max-w-sm"
          :placeholder="`${t('settings.profile_name')}`"
        >
          <template #button>
            <HoppButtonSecondary
              filled
              outline
              :label="t('action.save')"
              class="min-w-[4rem] ml-2"
              type="submit"
              :loading="updatingDisplayName"
              @click="updateDisplayName"
            />
          </template>
        </HoppSmartInput>
      </div>
      <div class="py-4">
        <label for="emailAddress">
          {{ t("settings.profile_email") }}
        </label>
        <HoppSmartInput
          v-model="emailAddress"
          :autofocus="false"
          styles="flex mt-2 md:max-w-sm"
          :placeholder="`${t('settings.profile_email')}`"
          :disabled="!isEmailEditable"
        >
          <template #button>
            <HoppButtonSecondary
              v-if="isEmailEditable"
              filled
              outline
              :label="t('action.save')"
              class="min-w-[4rem] ml-2"
              type="submit"
              :loading="updatingEmailAddress"
              @click="updateEmailAddress"
            />
          </template>
        </HoppSmartInput>
      </div>
    </section>

    <section class="p-4">
      <h4 class="font-semibold text-secondaryDark">
        {{ t("settings.sync") }}
      </h4>
      <div class="my-1 text-secondaryLight">
        {{ t("settings.sync_description") }}
      </div>
      <div class="space-y-4 py-4">
        <div class="flex items-center">
          <HoppSmartToggle
            :on="SYNC_COLLECTIONS"
            @change="toggleSetting('syncCollections')"
          >
            {{ t("settings.sync_collections") }}
          </HoppSmartToggle>
        </div>
        <div class="flex items-center">
          <HoppSmartToggle
            :on="SYNC_ENVIRONMENTS"
            @change="toggleSetting('syncEnvironments')"
          >
            {{ t("settings.sync_environments") }}
          </HoppSmartToggle>
        </div>
        <div class="flex items-center">
          <HoppSmartToggle
            :on="SYNC_HISTORY"
            @change="toggleSetting('syncHistory')"
          >
            {{ t("settings.sync_history") }}
          </HoppSmartToggle>
        </div>
      </div>
    </section>

    <template v-if="platform.ui?.additionalProfileSections?.length">
      <template
        v-for="(item, index) in platform.ui?.additionalProfileSections"
        :key="index"
      >
        <component :is="item" />
      </template>
    </template>

    <ProfileUserDelete />
  </div>
</template>

<script setup lang="ts">
import * as E from "fp-ts/Either"
import { computed, ref, watchEffect } from "vue"

import { platform } from "~/platform"

import { useI18n } from "@composables/i18n"
import { useSetting } from "@composables/settings"
import { useReadonlyStream } from "@composables/stream"
import { useToast } from "@composables/toast"

import { toggleSetting } from "~/newstore/settings"

const t = useI18n()
const toast = useToast()

const SYNC_COLLECTIONS = useSetting("syncCollections")
const SYNC_ENVIRONMENTS = useSetting("syncEnvironments")
const SYNC_HISTORY = useSetting("syncHistory")
const currentUser = useReadonlyStream(
  platform.auth.getCurrentUserStream(),
  platform.auth.getCurrentUser()
)

const isEmailEditable = computed(() => {
  return platform.auth.isEmailEditable ?? false
})

const displayName = ref(currentUser.value?.displayName || "")
const updatingDisplayName = ref(false)
watchEffect(() => (displayName.value = currentUser.value?.displayName || ""))

const updateDisplayName = async () => {
  const inputName = displayName.value.trim()
  if (!inputName) {
    toast.error(`${t("error.empty_profile_name")}`)
    return
  }

  if (currentUser.value?.displayName === inputName) {
    toast.error(`${t("error.same_profile_name")}`)
    return
  }

  updatingDisplayName.value = true

  const res = await platform.auth.setDisplayName(inputName)

  if (E.isLeft(res)) {
    toast.error(t("error.something_went_wrong"))
  } else if (E.isRight(res)) {
    toast.success(`${t("profile.updated")}`)
  }

  updatingDisplayName.value = false
}

const emailAddress = ref(currentUser.value?.email || "")
const updatingEmailAddress = ref(false)
watchEffect(() => (emailAddress.value = currentUser.value?.email || ""))

const updateEmailAddress = async () => {
  const inputEmailAddress = emailAddress.value.trim()
  if (!inputEmailAddress) {
    toast.error(`${t("error.empty_email_address")}`)
    return
  }

  if (currentUser.value?.email === inputEmailAddress) {
    toast.error(`${t("error.same_email_address")}`)
    return
  }

  updatingEmailAddress.value = true

  const result = await platform.auth.setEmailAddress(inputEmailAddress)

  if (!result) {
    toast.error(`${t("error.something_went_wrong")}`)
    updatingEmailAddress.value = false
    return
  }

  if (result.type === "success") {
    toast.success(`${t("profile.verified_email_sent")}`)
  } else if (result.type === "email-already-in-use") {
    toast.error(`${t("error.email_already_exists")}`)
  } else if (result.type === "requires-recent-login") {
    await result.link()
  } else {
    toast.error(`${t("error.something_went_wrong")}`)
  }
  updatingEmailAddress.value = false
}
</script>
