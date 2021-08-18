<template>
  <div>
    <div
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        top-upperSecondaryStickyFold
        pl-4
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <span class="flex items-center">
        <label class="font-semibold text-secondaryLight">
          {{ $t("authorization_type") }}
        </label>
        <tippy
          ref="authTypeOptions"
          interactive
          trigger="click"
          theme="popover"
          arrow
        >
          <template #trigger>
            <span class="select-wrapper">
              <ButtonSecondary
                class="rounded-none ml-2 pr-8"
                :label="authName"
              />
            </span>
          </template>
          <SmartItem
            label="None"
            @click.native="
              authType = 'none'
              authName = 'None'
              $refs.authTypeOptions.tippy().hide()
            "
          />
          <SmartItem
            label="Basic Auth"
            @click.native="
              authType = 'basic'
              authName = 'Basic Auth'
              $refs.authTypeOptions.tippy().hide()
            "
          />
          <SmartItem
            label="Bearer Token"
            @click.native="
              authType = 'bearer'
              authName = 'Bearer Token'
              $refs.authTypeOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <div class="flex">
        <SmartToggle
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ $t("enabled") }}
        </SmartToggle>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/"
          blank
          :title="$t('wiki')"
          icon="help_outline"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear')"
          icon="clear_all"
          @click.native="clearContent"
        />
      </div>
    </div>
    <div
      v-if="authType === 'none'"
      class="flex flex-col text-secondaryLight p-4 items-center justify-center"
    >
      <span class="text-center pb-4">
        {{ $t("empty.authorization") }}
      </span>
      <ButtonSecondary
        outline
        :label="$t('action.learn_more')"
        to="https://docs.hoppscotch.io"
        blank
        icon="open_in_new"
        reverse
      />
    </div>
    <div v-if="authType === 'basic'" class="space-y-2 p-2">
      <div class="flex relative">
        <input
          id="http_basic_user"
          v-model="basicUsername"
          class="input floating-input"
          placeholder=" "
          name="http_basic_user"
        />
        <label for="http_basic_user">
          {{ $t("username") }}
        </label>
      </div>
      <div class="flex relative">
        <input
          id="http_basic_passwd"
          v-model="basicPassword"
          class="input floating-input"
          placeholder=" "
          name="http_basic_passwd"
          :type="passwordFieldType"
        />
        <label for="http_basic_passwd">
          {{ $t("password") }}
        </label>
        <ButtonSecondary
          :icon="passwordFieldType === 'text' ? 'visibility' : 'visibility_off'"
          outline
          class="rounded ml-2"
          @click.native="switchVisibility"
        />
      </div>
      <div class="p-2">
        <div class="text-secondaryLight pb-2">
          {{ $t("helpers.authorization") }}
        </div>
        <SmartAnchor
          class="link"
          :label="$t('action.learn_more')"
          to="https://docs.hoppscotch.io/"
          blank
        />
      </div>
    </div>
    <div v-if="authType === 'bearer'" class="space-y-2 p-2">
      <div class="flex relative">
        <input
          id="bearer_token"
          v-model="bearerToken"
          class="input floating-input"
          placeholder=" "
          name="bearer_token"
        />
        <label for="bearer_token"> Token </label>
      </div>
      <div class="p-2">
        <div class="text-secondaryLight pb-2">
          {{ $t("helpers.authorization") }}
        </div>
        <SmartAnchor
          class="link"
          :label="$t('action.learn_more')"
          to="https://docs.hoppscotch.io/"
          blank
        />
      </div>
    </div>
    <!-- <button
            v-if="authType === 'OAuth 2.0'"
            v-tooltip.bottom="$t('use_token')"
            class="icon button"
            @click="showTokenListModal = !showTokenListModal"
          >
            <i class="material-icons">open_in_new</i>
          </button> -->
    <!-- <button
            v-if="authType === 'OAuth 2.0'"
            v-tooltip.bottom="$t('get_token')"
            class="icon button"
            @click="showTokenRequest = !showTokenRequest"
          >
            <i class="material-icons">vpn_key</i>
          </button> -->
    <!-- <SmartToggle
        :on="!URL_EXCLUDES.auth"
        @change="setExclude('auth', !$event)"
      >
        {{ $t("include_in_url") }}
      </SmartToggle> -->
  </div>
</template>

<script lang="ts">
import { defineComponent, Ref, ref } from "@nuxtjs/composition-api"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
} from "~/helpers/types/HoppRESTAuth"
import { pluckRef, useStream } from "~/helpers/utils/composables"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    const auth = useStream(
      restAuth$,
      { authType: "none", authName: "None", authActive: true },
      setRESTAuth
    )

    const authType = pluckRef(auth, "authType")
    const authName = pluckRef(auth, "authName")
    const authActive = pluckRef(auth, "authActive")

    const basicUsername = pluckRef(auth as Ref<HoppRESTAuthBasic>, "username")
    const basicPassword = pluckRef(auth as Ref<HoppRESTAuthBasic>, "password")

    const bearerToken = pluckRef(auth as Ref<HoppRESTAuthBearer>, "token")

    const URLExcludes = useSetting("URL_EXCLUDES")

    const passwordFieldType = ref("password")

    const clearContent = () => {
      auth.value = {
        authType: "none",
        authName: "None",
        authActive: true,
      }
    }

    const switchVisibility = () => {
      if (passwordFieldType.value === "text")
        passwordFieldType.value = "password"
      else passwordFieldType.value = "text"
    }

    return {
      auth,
      authType,
      authName,
      authActive,
      basicUsername,
      basicPassword,
      bearerToken,
      URLExcludes,
      passwordFieldType,
      clearContent,
      switchVisibility,
    }
  },
})
</script>
