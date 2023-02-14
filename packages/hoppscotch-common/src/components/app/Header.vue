<template>
  <div>
    <header
      class="flex items-center justify-between flex-1 flex-shrink-0 px-2 py-2 space-x-2 overflow-x-auto overflow-y-hidden"
    >
      <div
        class="inline-flex items-center justify-start flex-1 space-x-2"
        :style="{
          paddingTop: platform.ui?.appHeader?.paddingTop?.value,
          paddingLeft: platform.ui?.appHeader?.paddingLeft?.value,
        }"
      >
        <HoppButtonSecondary
          class="tracking-wide !font-bold !text-secondaryDark hover:bg-primaryDark focus-visible:bg-primaryDark uppercase"
          :label="t('app.name')"
          to="/"
        />
        <!-- <AppGitHubStarButton class="mt-1.5 transition" /> -->
      </div>
      <div class="inline-flex items-center justify-center flex-1 space-x-2">
        <AppNavigation />
        <div
          class="bg-primaryDark max-w-128 text-secondaryLight justify-between cursor-pointer rounded border border-dividerDark hover:border-dividerDark hover:bg-primaryLight hover:text-secondary focus-visible:border-dividerDark focus-visible:bg-primaryLight focus-visible:text-secondary focus:outline-none transition flex flex-1 items-center px-2 py-1.25"
          tabindex="0"
          @click="invokeAction('modals.search.toggle')"
        >
          <span class="inline-flex">
            <icon-lucide-search class="mr-2 svg-icons" />
            {{ t("app.search") }}
          </span>
          <kbd class="shortcut-key">/</kbd>
        </div>
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${
            mdAndLarger ? t('support.title') : t('app.options')
          } <kbd>?</kbd>`"
          :icon="IconHelpCircle"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="invokeAction('modals.support.toggle')"
        />
        <ButtonSecondary
          v-if="showInstallButton"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('header.install_pwa')"
          :icon="IconDownload"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="installPWA()"
        />
      </div>
      <div class="inline-flex items-center justify-end flex-1 space-x-2">
        <div
          v-if="currentUser === null"
          class="inline-flex items-center space-x-2"
        >
          <ButtonSecondary
            :icon="IconUploadCloud"
            :label="t('header.save_workspace')"
            class="hidden md:flex bg-green-500/15 py-1.75 border border-green-600/25 !text-green-500 hover:bg-green-400/10 hover:border-green-800/50 !hover:text-green-600"
            @click="invokeAction('modals.login.toggle')"
          />
          <ButtonPrimary
            :label="t('header.login')"
            @click="invokeAction('modals.login.toggle')"
          />
        </div>
        <div v-else class="inline-flex items-center space-x-2">
          <div
            v-if="workspace.type === 'team'"
            class="flex items-center mx-2 -space-x-1"
          >
            <ProfilePicture
              v-tippy="{ theme: 'tooltip' }"
              class="ring-2 ring-primary"
              url="https://images.unsplash.com/photo-1550525811-e5869dd03032?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="Random user"
              title="Random user"
            />
            <ProfilePicture
              v-tippy="{ theme: 'tooltip' }"
              class="ring-2 ring-primary"
              url="https://images.unsplash.com/photo-1491528323818-fdd1faba62cc?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="Random user"
              title="Random user"
            />
            <ProfilePicture
              v-tippy="{ theme: 'tooltip' }"
              class="ring-2 ring-primary"
              url="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2.25&w=256&h=256&q=80"
              alt="Random user"
              title="Random user"
            />
            <ProfilePicture
              v-tippy="{ theme: 'tooltip' }"
              class="ring-2 ring-primary"
              url="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
              alt="Random user"
              title="Random user"
            />
            <span
              v-tippy="{ theme: 'tooltip' }"
              class="z-10 flex items-center justify-center w-5 h-5 rounded-full cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-primaryDark font- text-8px text-secondaryDark bg-dividerDark ring-2 ring-primary"
              tabindex="0"
              title="+5 more"
            >
              +5
            </span>
          </div>
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="t('team.invite_tooltip')"
            :label="t('team.invite')"
            :icon="IconUserPlus"
            class="bg-green-500/15 py-1.75 border border-green-600/25 !text-green-500 hover:bg-green-400/10 hover:border-green-800/50 !hover:text-green-600"
            @click="showTeamsModal = true"
          />
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => accountActions.focus()"
          >
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('workspace.change')"
              :label="
                mdAndLarger
                  ? workspace.type === 'personal'
                    ? t('workspace.personal')
                    : workspace.teamName
                  : ``
              "
              :icon="workspace.type === 'personal' ? IconUser : IconUsers"
              class="pr-8 select-wrapper rounded bg-blue-500/15 py-1.75 border border-blue-600/25 !text-blue-500 hover:bg-blue-400/10 hover:border-blue-800/50 !hover:text-blue-600"
            />
            <template #content="{ hide }">
              <div
                ref="accountActions"
                class="flex flex-col focus:outline-none"
                tabindex="0"
                @keyup.escape="hide()"
                @click="hide()"
              >
                <WorkspaceSelector />
              </div>
            </template>
          </tippy>
          <span class="px-2">
            <tippy
              interactive
              trigger="click"
              theme="popover"
              :on-shown="() => tippyActions.focus()"
            >
              <ProfilePicture
                v-if="currentUser.photoURL"
                v-tippy="{
                  theme: 'tooltip',
                }"
                :url="currentUser.photoURL"
                :alt="
                  currentUser.displayName ||
                  t('profile.default_hopp_displayname')
                "
                :title="
                  currentUser.displayName ||
                  currentUser.email ||
                  t('profile.default_hopp_displayname')
                "
                indicator
                :indicator-styles="
                  network.isOnline ? 'bg-green-500' : 'bg-red-500'
                "
              />
              <ProfilePicture
                v-else
                v-tippy="{ theme: 'tooltip' }"
                :title="
                  currentUser.displayName ||
                  currentUser.email ||
                  t('profile.default_hopp_displayname')
                "
                :initial="currentUser.displayName || currentUser.email"
                indicator
                :indicator-styles="
                  network.isOnline ? 'bg-green-500' : 'bg-red-500'
                "
              />
              <template #content="{ hide }">
                <div
                  ref="tippyActions"
                  class="flex flex-col focus:outline-none"
                  tabindex="0"
                  @keyup.p="profile.$el.click()"
                  @keyup.s="settings.$el.click()"
                  @keyup.l="logout.$el.click()"
                  @keyup.escape="hide()"
                >
                  <div class="flex flex-col px-2 text-tiny">
                    <span class="inline-flex font-semibold truncate">
                      {{
                        currentUser.displayName ||
                        t("profile.default_hopp_displayname")
                      }}
                    </span>
                    <span class="inline-flex truncate text-secondaryLight">
                      {{ currentUser.email }}
                    </span>
                  </div>
                  <hr />
                  <HoppSmartItem
                    ref="profile"
                    to="/profile"
                    :icon="IconUser"
                    :label="t('navigation.profile')"
                    :shortcut="['P']"
                    @click="hide()"
                  />
                  <HoppSmartItem
                    ref="settings"
                    to="/settings"
                    :icon="IconSettings"
                    :label="t('navigation.settings')"
                    :shortcut="['S']"
                    @click="hide()"
                  />
                  <FirebaseLogout
                    ref="logout"
                    :shortcut="['L']"
                    @confirm-logout="hide()"
                  />
                </div>
              </template>
            </tippy>
          </span>
        </div>
      </div>
    </header>
    <AppAnnouncement v-if="!network.isOnline" />
    <TeamsModal :show="showTeamsModal" @hide-modal="showTeamsModal = false" />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue"
import IconUser from "~icons/lucide/user"
import IconUsers from "~icons/lucide/users"
import IconSettings from "~icons/lucide/settings"
import IconDownload from "~icons/lucide/download"
import IconUploadCloud from "~icons/lucide/upload-cloud"
import IconUserPlus from "~icons/lucide/user-plus"
import IconHelpCircle from "~icons/lucide/help-circle"
import { breakpointsTailwind, useBreakpoints, useNetwork } from "@vueuse/core"
import { pwaDefferedPrompt, installPWA } from "@modules/pwa"
import { platform } from "~/platform"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { invokeAction } from "@helpers/actions"
import { workspaceStatus$ } from "~/newstore/workspace"

const t = useI18n()

/**
 * Once the PWA code is initialized, this holds a method
 * that can be called to show the user the installation
 * prompt.
 */

const showInstallButton = computed(() => !!pwaDefferedPrompt.value)

const showTeamsModal = ref(false)

const breakpoints = useBreakpoints(breakpointsTailwind)
const mdAndLarger = breakpoints.greater("md")

const network = reactive(useNetwork())

const currentUser = useReadonlyStream(
  platform.auth.getProbableUserStream(),
  platform.auth.getProbableUser()
)

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

// Template refs
const tippyActions = ref<any | null>(null)
const profile = ref<any | null>(null)
const settings = ref<any | null>(null)
const logout = ref<any | null>(null)
const accountActions = ref<any | null>(null)
</script>
