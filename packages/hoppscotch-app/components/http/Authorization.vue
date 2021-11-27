<template>
  <div>
    <div
      class="bg-primary border-dividerLight top-upperSecondaryStickyFold sticky z-10 flex items-center justify-between flex-1 pl-4 border-b"
    >
      <span class="flex items-center">
        <label class="text-secondaryLight font-semibold">
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
                class="pr-8 ml-2 rounded-none"
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
        <!-- <SmartCheckbox
          :on="!URLExcludes.auth"
          @change="setExclude('auth', !$event)"
        >
          {{ $t("authorization.include_in_url") }}
        </SmartCheckbox> -->
        <SmartCheckbox
          :on="authActive"
          class="px-2"
          @change="authActive = !authActive"
        >
          {{ $t("state.enabled") }}
        </SmartCheckbox>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/features/authorization"
          blank
          :title="$t('app.wiki')"
          svg="help-circle"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.clear')"
          svg="trash-2"
          @click.native="clearContent"
        />
      </div>
    </div>
    <div
      v-if="authType === 'none'"
      class="text-secondaryLight flex flex-col items-center justify-center p-4"
    >
      <img
        :src="`/images/states/${$colorMode.value}/login.svg`"
        loading="lazy"
        class="inline-flex flex-col object-contain object-center w-16 h-16 my-4"
        :alt="$t('empty.authorization')"
      />
      <span class="pb-4 text-center">
        {{ $t("empty.authorization") }}
      </span>
      <ButtonSecondary
        outline
        :label="$t('app.documentation')"
        to="https://docs.hoppscotch.io/features/authorization"
        blank
        svg="external-link"
        reverse
        class="mb-4"
      />
    </div>
    <div v-if="authType === 'basic'" class="border-dividerLight flex border-b">
      <div class="border-dividerLight w-2/3 border-r">
        <div class="border-dividerLight flex border-b">
          <SmartEnvInput
            v-model="basicUsername"
            :placeholder="$t('authorization.username')"
            styles="bg-transparent flex flex-1 py-1 px-4"
          />
        </div>
        <div class="border-dividerLight flex border-b">
          <SmartEnvInput
            v-model="basicPassword"
            :placeholder="$t('authorization.password')"
            styles="bg-transparent flex flex-1 py-1 px-4"
          />
        </div>
      </div>
      <div
        class="bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9 sticky h-full p-4 overflow-auto"
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/features/authorization"
            blank
          />
        </div>
      </div>
    </div>
    <div v-if="authType === 'bearer'" class="border-dividerLight flex border-b">
      <div class="border-dividerLight w-2/3 border-r">
        <div class="border-dividerLight flex border-b">
          <SmartEnvInput
            v-model="bearerToken"
            placeholder="Token"
            styles="bg-transparent flex flex-1 py-1 px-4"
          />
        </div>
      </div>
      <div
        class="bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9 sticky h-full p-4 overflow-auto"
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/features/authorization"
            blank
          />
        </div>
      </div>
    </div>
    <div
      v-if="authType === 'oauth-2'"
      class="border-dividerLight flex border-b"
    >
      <div class="border-dividerLight w-2/3 border-r">
        <div class="border-dividerLight flex border-b">
          <SmartEnvInput
            v-model="oauth2Token"
            placeholder="Token"
            styles="bg-transparent flex flex-1 py-1 px-4"
          />
        </div>
        <HttpOAuth2Authorization />
      </div>
      <div
        class="bg-primary top-upperTertiaryStickyFold min-w-46 max-w-1/3 z-9 sticky h-full p-4 overflow-auto"
      >
        <div class="p-2">
          <div class="text-secondaryLight pb-2">
            {{ $t("helpers.authorization") }}
          </div>
          <SmartAnchor
            class="link"
            :label="`${$t('authorization.learn')} \xA0 →`"
            to="https://docs.hoppscotch.io/features/authorization"
            blank
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { computed, defineComponent, Ref } from "@nuxtjs/composition-api"
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
    const clearContent = () => {
      auth.value = {
        authType: "none",
        authActive: true,
      }
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
      clearContent,
    }
  },
})
</script>
