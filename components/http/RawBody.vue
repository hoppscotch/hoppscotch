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
      <label for="rawBody">
        {{ $t("raw_request_body") }}
      </label>
      <div class="flex">
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          to="https://docs.hoppscotch.io/"
          blank
          :title="$t('wiki')"
          icon="help_outline"
        />
        <ButtonSecondary
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('clear')"
          icon="clear_all"
          @click.native="clearContent('rawParams', $event)"
        />
        <ButtonSecondary
          v-if="contentType.endsWith('json')"
          ref="prettifyRequest"
          v-tippy="{ theme: 'tooltip' }"
          :title="$t('prettify_body')"
          :icon="prettifyIcon"
          @click.native="prettifyRequestBody"
        />
        <label for="payload">
          <ButtonSecondary
            v-tippy="{ theme: 'tooltip' }"
            :title="$t('import.json')"
            icon="post_add"
            @click.native="$refs.payload.click()"
          />
        </label>
        <input
          ref="payload"
          class="input"
          name="payload"
          type="file"
          @change="uploadPayload"
        />
      </div>
    </div>
    <div class="relative">
      <SmartAceEditor
        v-model="rawParamsBody"
        :lang="rawInputEditorLang"
        :options="{
          maxLines: Infinity,
          minLines: 16,
          fontSize: '12px',
          autoScrollEditorIntoView: true,
          showPrintMargin: false,
          useWorker: false,
        }"
      />
    </div>
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { getEditorLangForMimeType } from "~/helpers/editorutils"
import { pluckRef } from "~/helpers/utils/composables"
import { useRESTRequestBody } from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    contentType: {
      type: String,
      required: true,
    },
  },
  setup() {
    return {
      rawParamsBody: pluckRef(useRESTRequestBody(), "body"),
      prettifyIcon: "photo_filter",
    }
  },
  computed: {
    rawInputEditorLang() {
      return getEditorLangForMimeType(this.contentType)
    },
  },
  methods: {
    clearContent() {
      this.rawParamsBody = ""
    },
    uploadPayload() {
      const file = this.$refs.payload.files[0]
      if (file !== undefined && file !== null) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.rawParamsBody = target.result
        }
        reader.readAsText(file)
        this.$toast.info(this.$t("file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("choose_file"), {
          icon: "attach_file",
        })
      }
      this.$refs.payload.value = ""
    },
    prettifyRequestBody() {
      try {
        const jsonObj = JSON.parse(this.rawParamsBody)
        this.rawParamsBody = JSON.stringify(jsonObj, null, 2)
        this.prettifyIcon = "done"
        setTimeout(() => (this.prettifyIcon = "photo_filter"), 1000)
      } catch (e) {
        console.error(e)
        this.$toast.error(`${this.$t("json_prettify_invalid_body")}`, {
          icon: "error",
        })
      }
    },
  },
})
</script>
