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
        {{ $t("response.title") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          ref="downloadResponse"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.download_file')"
          :svg="downloadResponseIcon"
          @click.native="downloadResponse"
        />
        <ButtonSecondary
          ref="copyResponseButton"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('action.copy')"
          :svg="copyResponseIcon"
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
      <ButtonSecondary
        :label="$t('app.documentation')"
        to="https://docs.hoppscotch.io"
        svg="external-link"
        blank
        outline
        reverse
      />
    </div>
  </AppSection>
</template>

<script setup lang="ts">
import { PropType, ref, useContext } from "@nuxtjs/composition-api"
import { GQLConnection } from "~/helpers/GQLConnection"
import { copyToClipboard } from "~/helpers/utils/clipboard"
import { useReadonlyStream } from "~/helpers/utils/composables"
import { gqlResponse$ } from "~/newstore/GQLSession"

defineProps({
  conn: {
    type: Object as PropType<GQLConnection>,
    required: true,
  },
})

const {
  $toast,
  app: { i18n },
} = useContext()
const t = i18n.t.bind(i18n)

const responseString = useReadonlyStream(gqlResponse$, "")

const downloadResponseIcon = ref("download")
const copyResponseIcon = ref("copy")

const copyResponse = () => {
  copyToClipboard(responseString.value!)
  copyResponseIcon.value = "check"
  setTimeout(() => (copyResponseIcon.value = "copy"), 1000)
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
  downloadResponseIcon.value = "check"
  $toast.success(t("state.download_started").toString(), {
    icon: "downloading",
  })
  setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    downloadResponseIcon.value = "download"
  }, 1000)
}
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
