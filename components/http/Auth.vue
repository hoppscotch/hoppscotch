<template>
  <div>
    <div class="flex flex-1 p-2 items-center justify-between">
      <tippy
        ref="authTypeOptions"
        interactive
        trigger="click"
        theme="popover"
        arrow
      >
        <template #trigger>
          <div class="flex">
            <span class="select-wrapper">
              <ButtonSecondary
                class="pr-8"
                :label="`${$t('authentication')}: ${authType}`"
                outline
              />
            </span>
          </div>
        </template>
        <SmartItem
          label="None"
          @click.native="
            authType = 'none'
            $refs.authTypeOptions.tippy().hide()
          "
        />
        <SmartItem
          label="Basic"
          @click.native="
            authType = 'basic'
            $refs.authTypeOptions.tippy().hide()
          "
        />
        <SmartItem
          label="Bearer"
          @click.native="
            authType = 'bearer'
            $refs.authTypeOptions.tippy().hide()
          "
        />
      </tippy>
      <ButtonSecondary
        v-tippy="{ theme: 'tooltip' }"
        :title="$t('clear')"
        icon="clear_all"
        @click.native="clearContent"
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
          class="ml-2"
          @click.native="switchVisibility"
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
    const auth = useStream(restAuth$, { authType: "none" }, setRESTAuth)

    const authType = pluckRef(auth, "authType")

    const basicUsername = pluckRef(auth as Ref<HoppRESTAuthBasic>, "username")
    const basicPassword = pluckRef(auth as Ref<HoppRESTAuthBasic>, "password")

    const bearerToken = pluckRef(auth as Ref<HoppRESTAuthBearer>, "token")

    const URLExcludes = useSetting("URL_EXCLUDES")

    const passwordFieldType = ref("text")

    const clearContent = () => {
      auth.value = {
        authType: "none",
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
