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
          {{ $t("authorization.type") }}
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
              $refs.authTypeOptions.tippy().hide()
            "
          />
          <SmartItem
            label="Basic Auth"
            @click.native="
              authType = 'basic'
              $refs.authTypeOptions.tippy().hide()
            "
          />
          <SmartItem
            label="Bearer Token"
            @click.native="
              authType = 'bearer'
              $refs.authTypeOptions.tippy().hide()
            "
          />
          <SmartItem
            label="OAuth 2.0"
            @click.native="
              authType = 'oauth-2'
              $refs.authTypeOptions.tippy().hide()
            "
          />
        </tippy>
      </span>
      <div class="flex">
        <!-- <SmartToggle
          :on="!URLExcludes.auth"
          @change="setExclude('auth', !$event)"
        >
          {{ $t("authorization.include_in_url") }}
        </SmartToggle> -->
        <SmartToggle
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ $t("state.enabled") }}
        </SmartToggle>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/authorization"
          blank
          :title="$t('app.wiki')"
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
    <div v-if="authType === 'basic'" class="border-b border-dividerLight flex">
      <div class="border-r border-dividerLight w-2/3">
        <div
          class="divide-x divide-dividerLight border-b border-dividerLight flex"
        >
          <SmartEnvInput
            v-if="EXPERIMENTAL_URL_BAR_ENABLED"
            v-model="basicUsername"
            class="bg-primary flex flex-1 py-1 px-4"
            :placeholder="$t('authorization.username')"
          />
          <input
            v-else
            id="http_basic_user"
            v-model="basicUsername"
            class="bg-primary flex flex-1 py-2 px-4"
            :placeholder="$t('authorization.username')"
            name="http_basic_user"
          />
        </div>
        <div
          class="divide-x divide-dividerLight border-b border-dividerLight flex"
        >
          <SmartEnvInput
            v-if="EXPERIMENTAL_URL_BAR_ENABLED"
            v-model="basicPassword"
            class="bg-primary flex flex-1 py-1 px-4"
            :placeholder="$t('authorization.password')"
          />
          <input
            v-else
            id="http_basic_passwd"
            v-model="basicPassword"
            class="bg-primary flex flex-1 py-2 px-4"
            :placeholder="$t('authorization.password')"
            name="http_basic_passwd"
            :type="passwordFieldType"
          />
          <span>
            <ButtonSecondary
              :icon="
                passwordFieldType === 'text' ? 'visibility' : 'visibility_off'
              "
              @click.native="switchVisibility"
            />
          </span>
        </div>
      </div>
      <div
        class="
          h-full
          top-upperTertiaryStickyFold
          min-w-46
          max-w-1/3
          p-4
          z-9
          sticky
          overflow-auto
        "
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/"
            blank
          />
        </div>
      </div>
    </div>
    <div v-if="authType === 'bearer'" class="border-b border-dividerLight flex">
      <div class="border-r border-dividerLight w-2/3">
        <div
          class="divide-x divide-dividerLight border-b border-dividerLight flex"
        >
          <SmartEnvInput
            v-if="EXPERIMENTAL_URL_BAR_ENABLED"
            v-model="bearerToken"
            class="bg-primary flex flex-1 py-1 px-4"
            placeholder="Token"
          />
          <input
            v-else
            id="bearer_token"
            v-model="bearerToken"
            class="bg-primary flex flex-1 py-2 px-4"
            placeholder="Token"
            name="bearer_token"
          />
        </div>
      </div>
      <div
        class="
          h-full
          top-upperTertiaryStickyFold
          min-w-46
          max-w-1/3
          p-4
          z-9
          sticky
          overflow-auto
        "
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/"
            blank
          />
        </div>
      </div>
    </div>
    <div
      v-if="authType === 'oauth-2'"
      class="border-b border-dividerLight flex"
    >
      <div class="border-r border-dividerLight w-2/3">
        <div
          class="divide-x divide-dividerLight border-b border-dividerLight flex"
        >
          <SmartEnvInput
            v-if="EXPERIMENTAL_URL_BAR_ENABLED"
            v-model="oauth2Token"
            class="bg-primary flex flex-1 py-1 px-4"
            placeholder="Token"
          />
          <input
            v-else
            id="oauth2_token"
            v-model="oauth2Token"
            class="bg-primary flex flex-1 py-2 px-4"
            placeholder="Token"
            name="oauth2_token"
          />
        </div>
        <HttpOAuth2Authorization />
      </div>
      <div
        class="
          h-full
          top-upperTertiaryStickyFold
          min-w-46
          max-w-1/3
          p-4
          z-9
          sticky
          overflow-auto
        "
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/"
            blank
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, Ref, ref } from "@nuxtjs/composition-api"
import {
  HoppRESTAuthBasic,
  HoppRESTAuthBearer,
  HoppRESTAuthOAuth2,
} from "~/helpers/types/HoppRESTAuth"
import { pluckRef, useStream } from "~/helpers/utils/composables"
import { restAuth$, setRESTAuth } from "~/newstore/RESTSession"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  setup() {
    const auth = useStream(
      restAuth$,
      { authType: "none", authActive: true },
      setRESTAuth
    )

    const authType = pluckRef(auth, "authType")
    const authName = computed(() => {
      if (authType.value === "basic") return "Basic Auth"
      else if (authType.value === "bearer") return "Bearer"
      else if (authType.value === "oauth-2") return "OAuth 2.0"
      else return "None"
    })
    const authActive = pluckRef(auth, "authActive")

    const basicUsername = pluckRef(auth as Ref<HoppRESTAuthBasic>, "username")
    const basicPassword = pluckRef(auth as Ref<HoppRESTAuthBasic>, "password")

    const bearerToken = pluckRef(auth as Ref<HoppRESTAuthBearer>, "token")

    const oauth2Token = pluckRef(auth as Ref<HoppRESTAuthOAuth2>, "token")

    const URLExcludes = useSetting("URL_EXCLUDES")

    const passwordFieldType = ref("password")

    const clearContent = () => {
      auth.value = {
        authType: "none",
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
      oauth2Token,
      URLExcludes,
      passwordFieldType,
      clearContent,
      switchVisibility,
      EXPERIMENTAL_URL_BAR_ENABLED: useSetting("EXPERIMENTAL_URL_BAR_ENABLED"),
    }
  },
})
</script>
