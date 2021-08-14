<template>
  <AppSection ref="response" label="response">
    <div
      v-if="responseString"
      class="
        bg-primary
        border-b border-dividerLight
        flex flex-1
        pl-4
        top-0
        z-10
        sticky
        items-center
        justify-between
      "
    >
      <label class="font-semibold text-secondaryLight">
        {{ $t("response") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('download_file')"
          :icon="downloadResponseIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          ref="copyResponseButton"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :icon="copyResponseIcon"
          @click.native="copyResponse"
        />
      </div>
    </div>
    <SmartAceEditor
      v-if="responseString"
      :value="responseString"
      :lang="'json'"
      :lint="false"
      :options="{
        maxLines: Infinity,
        minLines: 16,
        autoScrollEditorIntoView: true,
        readOnly: true,
        showPrintMargin: false,
        useWorker: false,
      }"
      styles="border-b border-dividerLight"
    />
    <div
      v-else
      class="
        flex flex-col flex-1
        text-secondaryLight
        p-4
        items-center
        justify-center
      "
    >
      <div class="flex space-x-2 pb-4">
        <div class="flex flex-col space-y-4 items-end">
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.send_request") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.show_all") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.command_menu") }}
          </span>
          <span class="flex flex-1 items-center">
            {{ $t("shortcut.general.help_menu") }}
          </span>
        </div>
        <div class="flex flex-col space-y-4">
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">G</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">{{ getSpecialKey() }}</span>
            <span class="shortcut-key">K</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">/</span>
          </div>
          <div class="flex">
            <span class="shortcut-key">?</span>
          </div>
        </div>
      </div>
      <ButtonSecondary
        :label="$t('documentation')"
        to="https://docs.hoppscotch.io"
        icon="open_in_new"
        blank
        outline
        reverse
      />
    </div>
  </AppSection>
</template>

<script lang="ts">
import {
  defineComponent,
  PropType,
  ref,
  useContext,
} from "@nuxtjs/composition-api"
import { GQLConnection } from "~/helpers/GQLConnection"
import { getPlatformSpecialKey } from "~/helpers/platformutils"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { gqlResponse$ } from "~/newstore/GQLSession"

export default defineComponent({
  props: {
    conn: {
      type: Object as PropType<GQLConnection>,
      required: true,
    },
  },
  setup() {
    const {
      $toast,
      app: { i18n },
    } = useContext()
    const t = i18n.t.bind(i18n)

    const responseString = useReadonlyStream(gqlResponse$, "")

    const downloadResponseIcon = ref("save_alt")
    const copyResponseIcon = ref("content_copy")

    const copyResponse = () => {
      copyToClipboard(responseString.value!)
      copyResponseIcon.value = "done"
      setTimeout(() => (copyResponseIcon.value = "content_copy"), 1000)
    }

    const downloadResponse = () => {
      const dataToWrite = responseString.value
      const file = new Blob([dataToWrite!], { type: "application/json" })
      const a = document.createElement("a")
      const url = URL.createObjectURL(file)
      a.href = url
      a.download = `${url.split("/").pop()!.split("#")[0].split("?")[0]}`
      document.body.appendChild(a)
      a.click()
      downloadResponseIcon.value = "done"
      $toast.success(t("download_started").toString(), {
        icon: "done",
      })
      setTimeout(() => {
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        downloadResponseIcon.value = "save_alt"
      }, 1000)
    }

    return {
      responseString,

      downloadResponseIcon,
      copyResponseIcon,

      downloadResponse,
      copyResponse,

      getSpecialKey: getPlatformSpecialKey,
    }
  },
})
</script>

<style lang="scss" scoped>
.shortcut-key {
  @apply bg-dividerLight;
  @apply rounded;
  @apply ml-2;
  @apply py-1;
  @apply px-2;
  @apply inline-flex;
}
</style>
