<template>
  <div class="h-screen p-5 flex flex-col gap-y-2">
    <h1 class="font-bold text-lg text-white">{{ pipe(state(), getTitle) }}</h1>

    <template v-if="O.isSome(state().otp)">
      <div class="flex-grow">
        <p class="tracking-wide">
          An app is trying to register against the Hoppscotch Agent. If this was intentional, copy the given code into
          the app to complete the registration process. Please cancel the registration if you did not initiate this request.
          The window will hide automatically once registration succeeds. If you minimize this window during registration,
          you can access it again from the tray by selecting "Maximize Window".
        </p>
        <p
          class="font-bold text-5xl tracking-wider text-center pt-10 text-white"
        >{{ pipe(state().otp, O.getOrElse(() => "")) }}</p>
      </div>
    </template>

    <template v-else>
      <div class="flex-grow overflow-auto">
        <HoppSmartTable :headings="tableHeadings" :list="state().registrations">
          <template #registered_at="{ item }">{{ formatDate(String(item.registered_at)) }}</template>
        </HoppSmartTable>
      </div>
    </template>

    <div class="border-t border-divider p-5 flex justify-between">
      <HoppButtonSecondary
        v-if="shouldShowCopy(state())"
        label="Copy Code"
        outline
        filled
        :icon="copyIcon"
        @click="copyOtp"
      />
      <div class="flex gap-2">
        <template v-if="O.isSome(state().otp)">
          <HoppButtonSecondary
            label="Cancel Registration"
            outline
            @click="getCurrentWindow().close()"
          />
          <HoppButtonPrimary
            label="Minimize to Tray"
            outline
            @click="hideWindow"
          />
        </template>

          <HoppButtonPrimary
            v-else
            label="Minimize to Tray"
            outline
            @click="hideWindow"
          />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, markRaw, onMounted } from "vue"
import {
  HoppButtonPrimary,
  HoppButtonSecondary,
  HoppSmartTable,
} from "@hoppscotch/ui"
// @ts-ignore
import IconCopy from "~icons/lucide/copy"
// @ts-ignore
import IconCheck from "~icons/lucide/check"
import { useClipboard, refAutoReset } from "@vueuse/core"
import { getCurrentWindow } from "@tauri-apps/api/window"
import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { pipe } from "fp-ts/function"
import * as O from "fp-ts/Option"
import * as TE from "fp-ts/TaskEither"
import { orderBy } from "lodash-es"

interface Registration {
  auth_key_hash: string
  registered_at: string
}

interface AppState {
  view: "otp" | "registrations"
  otp: O.Option<string>
  registrations: Registration[]
}

interface CellHeading {
  key: string
  label: string
}

const tableHeadings: CellHeading[] = [
  { key: "auth_key_hash", label: "ID" },
  { key: "registered_at", label: "Registered At" },
]

const { copy } = useClipboard()
const copyIcon = refAutoReset(markRaw(IconCopy), 3000)
const appState = ref<AppState>({
  view: "otp",
  otp: O.none,
  registrations: [],
})

const state = () => appState.value

const getTitle = (s: AppState): string =>
  O.isSome(s.otp) ? "Agent Registration Request" : "Agent Registrations"
const shouldShowCopy = (s: AppState): boolean => O.isSome(s.otp)
const formatDate = (date: string): string => new Date(date).toLocaleString()

const getOtp = TE.tryCatch(
  () => invoke<string>("get_otp", {}),
  (error: unknown) => new Error(String(error))
)

const listRegistrations = TE.tryCatch(
  async () => {
    const result = await invoke<{ registrations: Registration[] }>(
      "list_registrations",
      {}
    )
    return orderBy(result.registrations, "registered_at", "desc")
  },
  (error: unknown) => new Error(String(error))
)

const hideWindow = () => {
  getCurrentWindow().hide()
  appState.value = { ...state(), otp: O.none }
}

const copyOtp = () => {
  pipe(
    state().otp,
    O.map((otp: string) => {
      copyIcon.value = markRaw(IconCheck)
      copy(otp)
    })
  )
}

const updateRegistrations = async () => {
  await pipe(
    listRegistrations,
    TE.map((registrations: Registration[]) => {
      appState.value = { ...state(), registrations }
    })
  )()
}

const handleRegistrationReceived = (payload: string) => {
  appState.value = {
    ...state(),
    view: "otp",
    otp: O.some(payload),
  }
  getCurrentWindow().setFocus()
}

const handleAuthenticated = async () => {
  appState.value = { ...state(), otp: O.none }
  await updateRegistrations()
  hideWindow()
}

const handleShowRegistrations = async () => {
  appState.value = { ...state(), view: "registrations" }
  await updateRegistrations()
}

onMounted(async () => {
  getCurrentWindow().setAlwaysOnTop(true)

  await pipe(
    getOtp,
    TE.map((otp: string) => {
      if (otp) {
        appState.value = { ...state(), otp: O.some(otp) }
      } else {
        updateRegistrations();
      }
    })
  )()

  await Promise.all([
    listen<string>(
      "registration-received",
      ({ payload }: { payload: string }) => handleRegistrationReceived(payload)
    ),
    listen(
      "window-hidden",
      () => (appState.value = { ...state(), otp: O.none })
    ),
    listen("authenticated", handleAuthenticated),
    listen("show-registrations", handleShowRegistrations),
    listen("show-otp-view", async () => {
      await pipe(
        getOtp,
        TE.map((otp: string) => {
          if (otp) {
            appState.value = { ...state(), otp: O.some(otp) };
          } else {
            updateRegistrations();
          }
        })
      )();
    }),
  ])
})
</script>
