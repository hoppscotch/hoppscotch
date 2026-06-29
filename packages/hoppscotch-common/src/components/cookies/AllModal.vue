<template>
  <HoppSmartModal
    v-if="show"
    dialog
    :title="t('app.cookies')"
    aria-modal="true"
    @close="hideModal"
  >
    <template #body>
      <HoppSmartPlaceholder
        v-if="!currentInterceptorSupportsCookies"
        :src="`/images/states/${colorMode.value}/add_category.svg`"
        :alt="`${t('cookies.modal.interceptor_no_support')}`"
        :text="t('cookies.modal.interceptor_no_support')"
      >
        <template #body>
          <AppKernelInterceptor
            class="rounded border border-dividerLight p-2"
          />
        </template>
      </HoppSmartPlaceholder>
      <div v-else class="flex flex-col">
        <div
          class="sticky -mx-4 -mt-4 flex space-x-2 border-b border-dividerLight bg-primary px-4 py-4"
          style="top: calc(-1 * var(--line-height-body))"
        >
          <HoppSmartInput
            v-model="newDomainText"
            class="flex-1"
            :placeholder="t('cookies.modal.new_domain_name')"
            @keyup.enter="addNewDomain"
          />
          <HoppButtonSecondary
            outline
            filled
            :label="t('action.add')"
            @click="addNewDomain"
          />
        </div>
        <div class="flex flex-col space-y-4">
          <HoppSmartPlaceholder
            v-if="workingCookieJar.size === 0"
            :src="`/images/states/${colorMode.value}/blockchain.svg`"
            :alt="`${t('cookies.modal.empty_domains')}`"
            :text="t('cookies.modal.empty_domains')"
            class="mt-6"
          />
          <div
            v-for="[domain, entries] in workingCookieJar.entries()"
            v-else
            :key="domain"
            class="flex flex-col"
          >
            <div class="flex flex-1 items-center justify-between">
              <label class="p-4">
                {{ domain }}
              </label>
              <div class="flex">
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('action.delete')"
                  :icon="IconTrash2"
                  @click="deleteDomain(domain)"
                />
                <HoppButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  :title="t('add.new')"
                  :icon="IconPlus"
                  @click="addCookieToDomain(domain)"
                />
              </div>
            </div>
            <div class="rounded border border-divider">
              <div class="divide-y divide-dividerLight">
                <div
                  v-if="entries.length === 0"
                  class="flex flex-col items-center gap-2 p-4"
                >
                  {{ t("cookies.modal.no_cookies_in_domain") }}
                </div>
                <template v-else>
                  <div
                    v-for="(entry, entryIndex) in entries"
                    :key="`${entry.name}-${entryIndex}`"
                    class="flex w-full divide-x divide-dividerLight items-center"
                  >
                    <input
                      class="flex flex-1 bg-transparent px-4 py-2"
                      :value="`${entry.name} => ${entry.value}`"
                      readonly
                    />
                    <span
                      v-if="entry.httpOnly"
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('cookies.modal.http_only_info')"
                      class="px-2 text-tiny font-semibold text-secondaryLight"
                    >
                      {{ t("cookies.modal.http_only") }}
                    </span>
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.copy')"
                      :icon="IconCopy"
                      @click="copyCookie(entry)"
                    />
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.edit')"
                      :icon="IconEdit"
                      @click="editCookie(domain, entryIndex, entry)"
                    />
                    <HoppButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="t('action.remove')"
                      :icon="IconTrash"
                      color="red"
                      @click="deleteCookie(domain, entryIndex)"
                    />
                  </div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <template v-if="currentInterceptorSupportsCookies" #footer>
      <span class="flex space-x-2">
        <HoppButtonPrimary
          v-focus
          :label="t('action.save')"
          outline
          @click="saveCookieChanges"
        />
        <HoppButtonSecondary
          :label="t('action.cancel')"
          outline
          filled
          @click="cancelCookieChanges"
        />
      </span>
      <HoppButtonSecondary
        :label="t('action.clear_all')"
        outline
        filled
        @click="clearAllDomains"
      />
    </template>
  </HoppSmartModal>
  <CookiesEditCookie
    :show="!!showEditModalFor"
    :entry="showEditModalFor"
    @save-cookie="saveCookie"
    @hide-modal="showEditModalFor = null"
  />
</template>

<script setup lang="ts">
import { useI18n } from "@composables/i18n"
import { useService } from "dioc/vue"
import { CookieJarService } from "~/services/cookie-jar.service"
import { Cookie } from "@hoppscotch/data"
import IconTrash from "~icons/lucide/trash"
import IconEdit from "~icons/lucide/edit"
import IconTrash2 from "~icons/lucide/trash-2"
import IconPlus from "~icons/lucide/plus"
import IconCopy from "~icons/lucide/copy"
import { cloneDeep, isEqual } from "lodash-es"
import { ref, watch, computed } from "vue"
import { EditCookieConfig } from "./EditCookie.vue"
import { useColorMode } from "@composables/theming"
import { useToast } from "@composables/toast"
import { KernelInterceptorService } from "~/services/kernel-interceptor.service"

const props = defineProps<{ show: boolean }>()
const emit = defineEmits<{ (e: "hide-modal"): void }>()

const t = useI18n()
const colorMode = useColorMode()
const toast = useToast()

const newDomainText = ref("")
const interceptorService = useService(KernelInterceptorService)
const cookieJarService = useService(CookieJarService)

// `baselineCookieJar` is the user's view of the jar at modal-open
// time, kept separately from `workingCookieJar` so the save can
// apply only the user's edits as a per-cookie delta. Without this
// the previous wholesale `replaceAll` overwrote any cookies the
// request flow captured into the live jar while the modal was open.
const baselineCookieJar = ref(cloneDeep(cookieJarService.cookieJar.value))
const workingCookieJar = ref(cloneDeep(cookieJarService.cookieJar.value))

const currentInterceptorSupportsCookies = computed(() => {
  const caps = interceptorService.current.value?.capabilities
  return caps?.advanced?.has("cookies") ?? false
})

function addNewDomain() {
  // Canonicalize through the service so the new row's key matches
  // the form the eventual save uses. Without this the modal row
  // and `cookieKey` would disagree (modal row keyed `Example.COM`,
  // save key `example.com`), and two visually different
  // entries that canonicalize to the same domain would add as
  // separate rows then clobber each other at save time.
  const trimmed = newDomainText.value.trim()
  if (trimmed === "") {
    toast.error(`${t("cookies.modal.empty_domain")}`)
    return
  }
  const canon = cookieJarService.canonStoreDomain(trimmed)
  // `upsertCookies` skips a domain that canonicalizes to empty or
  // carries internal whitespace, so the modal would otherwise let
  // the user create a row that vanishes silently on save. The
  // validation mirrors the service contract and surfaces a
  // localized error instead.
  if (canon.length === 0 || /\s/.test(canon)) {
    toast.error(`${t("cookies.modal.invalid_domain")}`)
    return
  }
  // If the user types a domain that already has a row, `.set` with
  // an empty array would wipe the existing cookies under that
  // domain on save. The duplicate-add is treated as a no-op so an
  // accidental re-type does not remove cookies the user can see in
  // the same modal.
  if (workingCookieJar.value.has(canon)) {
    newDomainText.value = ""
    return
  }
  workingCookieJar.value.set(canon, [])
  newDomainText.value = ""
}

function deleteDomain(domain: string) {
  workingCookieJar.value.delete(domain)
}

function addCookieToDomain(domain: string) {
  showEditModalFor.value = { type: "create", domain }
}

function clearAllDomains() {
  workingCookieJar.value = new Map()
  toast.success(`${t("state.cleared")}`)
}

watch(
  () => props.show,
  async (show) => {
    if (show) {
      await cookieJarService.whenReady()
      baselineCookieJar.value = cloneDeep(cookieJarService.cookieJar.value)
      workingCookieJar.value = cloneDeep(cookieJarService.cookieJar.value)
    }
  }
)

const showEditModalFor = ref<EditCookieConfig | null>(null)

function flatten(jar: Map<string, Cookie[]>): Cookie[] {
  const out: Cookie[] = []
  for (const cookies of jar.values()) {
    for (const c of cookies) {
      out.push(c)
    }
  }
  return out
}

// NUL between fields, never a valid cookie character per RFC 6265,
// so the key cannot collide across different (domain, name, path)
// tuples the way a space separator can when a path contains
// whitespace.
const cookieKey = (c: Cookie) =>
  `${cookieJarService.canonStoreDomain(c.domain)}\u0000${c.name}\u0000${c.path && c.path.length > 0 ? c.path : "/"}`

async function saveCookieChanges() {
  const before = new Map<string, Cookie>()
  for (const c of flatten(baselineCookieJar.value)) {
    before.set(cookieKey(c), c)
  }
  const after = new Map<string, Cookie>()
  for (const c of flatten(workingCookieJar.value)) {
    after.set(cookieKey(c), c)
  }

  const upserts: Cookie[] = []
  for (const [key, post] of after) {
    const prior = before.get(key)
    if (!prior || !isEqual(prior, post)) {
      upserts.push(post)
    }
  }

  const removes: Array<{ domain: string; name: string; path?: string }> = []
  for (const [key, prior] of before) {
    if (!after.has(key)) {
      removes.push({
        domain: prior.domain,
        name: prior.name,
        path: prior.path,
      })
    }
  }

  // Domains the user removed from `workingCookieJar` may have
  // gained new cookies in the live jar (response capture during
  // the modal session). The delta against baseline would leave
  // them alive even though the user clicked delete on the
  // domain, so the removed-domain sweep walks baseline keys and
  // catches any concurrent capture under those keys.
  //
  // The sweep is restricted to baseline keys deliberately. A
  // domain that first appeared in the live jar during the modal
  // session is in neither baseline nor working, and treating it
  // as removed-by-the-user would delete cookies for a domain the
  // user never saw and never decided about. Clear All has the
  // same constraint, the at-open baseline is the only signal of
  // what the user could have decided to remove.
  const removedDomains = new Set<string>()
  for (const d of baselineCookieJar.value.keys()) {
    if (!workingCookieJar.value.has(d)) {
      removedDomains.add(d)
    }
  }
  for (const domain of removedDomains) {
    const liveCookies = cookieJarService.cookieJar.value.get(domain) ?? []
    for (const c of liveCookies) {
      const key = cookieKey(c)
      if (!before.has(key)) {
        removes.push({ domain: c.domain, name: c.name, path: c.path })
      }
    }
  }

  if (upserts.length > 0) {
    await cookieJarService.upsertCookies(upserts)
  }
  if (removes.length > 0) {
    await cookieJarService.deleteCookies(removes)
  }
  hideModal()
}

function cancelCookieChanges() {
  hideModal()
}

function editCookie(domain: string, entryIndex: number, cookieEntry: Cookie) {
  showEditModalFor.value = {
    type: "edit",
    domain,
    entryIndex,
    currentCookieEntry: cookieEntry,
  }
}

function deleteCookie(domain: string, entryIndex: number) {
  const entry = workingCookieJar.value.get(domain)
  if (entry) entry.splice(entryIndex, 1)
}

function saveCookie(value: string) {
  if (showEditModalFor.value?.type === "create") {
    const { domain } = showEditModalFor.value
    const entry = workingCookieJar.value.get(domain)!

    // Auto-name uses one past the highest existing `Cookie-N` so
    // a delete-then-create flow does not produce two rows with
    // the same name (which `cookieKey`'s `(domain, name, path)`
    // merge would collapse to one on save and silently drop the
    // duplicate).
    let next = 0
    for (const existing of entry) {
      const m = /^Cookie-(\d+)$/.exec(existing.name)
      if (m) {
        const n = Number(m[1])
        if (n >= next) next = n + 1
      }
    }
    const name = `Cookie-${next}`
    entry.push(makeUICookie(domain, value, name))
    showEditModalFor.value = null
    return
  }
  if (showEditModalFor.value?.type === "edit") {
    const { domain, entryIndex } = showEditModalFor.value
    const entry = workingCookieJar.value.get(domain)
    if (entry) entry[entryIndex].value = value
    showEditModalFor.value = null
  }
}

function makeUICookie(domain: string, value: string, name: string): Cookie {
  return {
    name,
    value,
    domain,
    path: "/",
    httpOnly: false,
    secure: false,
    sameSite: "Lax",
  }
}

function copyCookie(cookie: Cookie) {
  navigator.clipboard.writeText(`${cookie.name}=${cookie.value}`)
  toast.success(t("state.copied"))
}

const hideModal = () => {
  emit("hide-modal")
}
</script>
