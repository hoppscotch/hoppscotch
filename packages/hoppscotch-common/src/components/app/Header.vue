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
      <div class="inline-flex items-center space-x-2">
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${t('app.search')} <kbd>/</kbd>`"
          :icon="IconSearch"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="invokeAction('modals.search.toggle')"
        />
        <HoppButtonSecondary
          v-if="showInstallButton"
          v-tippy="{ theme: 'tooltip' }"
          :title="t('header.install_pwa')"
          :icon="IconDownload"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="installPWA()"
        />
        <HoppButtonSecondary
          v-tippy="{ theme: 'tooltip', allowHTML: true }"
          :title="`${
            mdAndLarger ? t('support.title') : t('app.options')
          } <kbd>?</kbd>`"
          :icon="IconLifeBuoy"
          class="rounded hover:bg-primaryDark focus-visible:bg-primaryDark"
          @click="invokeAction('modals.support.toggle')"
        />
        <div
          v-if="currentUser === null"
          class="inline-flex items-center space-x-2"
        >
          <HoppButtonSecondary
            :icon="IconUploadCloud"
            :label="t('header.save_workspace')"
            class="hidden md:flex bg-green-500/15 py-1.75 border border-green-600/25 !text-green-500 hover:bg-green-400/10 focus-visible:bg-green-400/10 focus-visible:border-green-800/50 !focus-visible:text-green-600 hover:border-green-800/50 !hover:text-green-600"
            @click="invokeAction('modals.login.toggle')"
          />
          <HoppButtonPrimary
            :label="t('header.login')"
            @click="invokeAction('modals.login.toggle')"
          />
        </div>
        <div v-else class="inline-flex items-center space-x-2">
          <TeamsMemberStack
            v-if="
              workspace.type === 'team' &&
              selectedTeam &&
              selectedTeam.teamMembers.length > 1
            "
            :team-members="selectedTeam.teamMembers"
            show-count
            class="mx-2"
            @handle-click="handleTeamEdit()"
          />
          <div
            class="flex border divide-x rounded bg-green-500/15 divide-green-600/25 border-green-600/25 focus-within:bg-green-400/10 focus-within:border-green-800/50 focus-within:divide-green-800/50 hover:bg-green-400/10 hover:border-green-800/50 hover:divide-green-800/50"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('team.invite_tooltip')"
              :icon="IconUserPlus"
              class="py-1.75 !text-green-500 !focus-visible:text-green-600 !hover:text-green-600"
              @click="handleInvite()"
            />
            <HoppButtonSecondary
              v-if="
                workspace.type === 'team' &&
                selectedTeam &&
                selectedTeam?.myRole === 'OWNER'
              "
              v-tippy="{ theme: 'tooltip' }"
              :title="t('team.edit')"
              :icon="IconSettings"
              class="py-1.75 !text-green-500 !focus-visible:text-green-600 !hover:text-green-600"
              @click="handleTeamEdit()"
            />
          </div>
          <tippy
            interactive
            trigger="click"
            theme="popover"
            :on-shown="() => accountActions.focus()"
          >
            <HoppButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="t('workspace.change')"
              :label="mdAndLarger ? workspaceName : ``"
              :icon="workspace.type === 'personal' ? IconUser : IconUsers"
              class="pr-8 select-wrapper rounded bg-blue-500/15 py-1.75 border border-blue-600/25 !text-blue-500 focus-visible:bg-blue-400/10 focus-visible:border-blue-800/50 !focus-visible:text-blue-600 hover:bg-blue-400/10 hover:border-blue-800/50 !hover:text-blue-600"
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
              <HoppSmartPicture
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
              <HoppSmartPicture
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
    <TeamsInvite
      v-if="workspace.type === 'team' && workspace.teamID"
      :show="showModalInvite"
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalInvite(false)"
    />
    <TeamsEdit
      :show="showModalEdit"
      :editing-team="editingTeamName"
      :editing-team-i-d="editingTeamID"
      @hide-modal="displayModalEdit(false)"
      @invite-team="inviteTeam(editingTeamName, editingTeamID)"
      @refetch-teams="refetchTeams"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue"
import IconUser from "~icons/lucide/user"
import IconUsers from "~icons/lucide/users"
import IconSettings from "~icons/lucide/settings"
import IconDownload from "~icons/lucide/download"
import IconUploadCloud from "~icons/lucide/upload-cloud"
import IconUserPlus from "~icons/lucide/user-plus"
import IconLifeBuoy from "~icons/lucide/life-buoy"
import IconSearch from "~icons/lucide/search"
import { breakpointsTailwind, useBreakpoints, useNetwork } from "@vueuse/core"
import { pwaDefferedPrompt, installPWA } from "@modules/pwa"
import { platform } from "~/platform"
import { useI18n } from "@composables/i18n"
import { useReadonlyStream } from "@composables/stream"
import { invokeAction } from "@helpers/actions"
import { workspaceStatus$, updateWorkspaceTeamName } from "~/newstore/workspace"
import TeamListAdapter from "~/helpers/teams/TeamListAdapter"
import { onLoggedIn } from "~/composables/auth"
import { GetMyTeamsQuery } from "~/helpers/backend/graphql"

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

const selectedTeam = ref<GetMyTeamsQuery["myTeams"][number] | undefined>()

// TeamList-Adapter
const teamListAdapter = new TeamListAdapter(true)
const myTeams = useReadonlyStream(teamListAdapter.teamList$, null)

const workspace = useReadonlyStream(workspaceStatus$, { type: "personal" })

const workspaceName = computed(() =>
  workspace.value.type === "personal"
    ? t("workspace.personal")
    : workspace.value.teamName
)

const refetchTeams = () => {
  teamListAdapter.fetchList()
}

onLoggedIn(() => {
  !teamListAdapter.isInitialized && teamListAdapter.initialize()
})

watch(
  () => myTeams.value,
  (newTeams) => {
    if (newTeams && workspace.value.type === "team" && workspace.value.teamID) {
      const team = newTeams.find((team) => team.id === workspace.value.teamID)
      if (team) {
        selectedTeam.value = team
        // Update the workspace name if it's not the same as the updated team name
        if (team.name !== workspace.value.teamName) {
          updateWorkspaceTeamName(workspace.value, team.name)
        }
      }
    }
  }
)

watch(
  () => workspace.value,
  (newWorkspace) => {
    if (newWorkspace.type === "team") {
      const team = myTeams.value?.find((t) => t.id === newWorkspace.teamID)
      if (team) {
        selectedTeam.value = team
      }
    }
  }
)

const showModalInvite = ref(false)
const showModalEdit = ref(false)

const editingTeamName = ref<{ name: string }>({ name: "" })
const editingTeamID = ref("")

const displayModalInvite = (show: boolean) => {
  showModalInvite.value = show
}

const displayModalEdit = (show: boolean) => {
  showModalEdit.value = show
  teamListAdapter.fetchList()
}

const inviteTeam = (team: { name: string }, teamID: string) => {
  editingTeamName.value = team
  editingTeamID.value = teamID
  displayModalInvite(true)
}

// Show the workspace selected team invite modal if the user is an owner of the team else show the default invite modal
const handleInvite = () => {
  if (
    workspace.value.type === "team" &&
    workspace.value.teamID &&
    selectedTeam.value?.myRole === "OWNER"
  ) {
    editingTeamID.value = workspace.value.teamID
    displayModalInvite(true)
  } else {
    showTeamsModal.value = true
  }
}

// Show the workspace selected team edit modal if the user is an owner of the team
const handleTeamEdit = () => {
  if (
    workspace.value.type === "team" &&
    workspace.value.teamID &&
    selectedTeam.value?.myRole === "OWNER"
  ) {
    editingTeamID.value = workspace.value.teamID
    editingTeamName.value = { name: selectedTeam.value.name }
    displayModalEdit(true)
  }
}

// Template refs
const tippyActions = ref<any | null>(null)
const profile = ref<any | null>(null)
const settings = ref<any | null>(null)
const logout = ref<any | null>(null)
const accountActions = ref<any | null>(null)
</script>
