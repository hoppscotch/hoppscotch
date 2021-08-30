<template>
  <SmartModal v-if="show" :title="$t('import.curl')" @close="hideModal">
    <template #body>
      <div class="flex flex-col px-2">
        <textarea-autosize
          id="import-curl"
          v-model="curl"
          class="textarea floating-input"
          autofocus
          rows="8"
          placeholder=" "
        />
        <label for="import-curl">
          {{ $t("request.enter_curl") }}
        </label>
      </div>
    </template>
    <template #footer>
      <span>
        <ButtonPrimary
          :label="$t('import.title')"
          @click.native="handleImport"
        />
        <ButtonSecondary
          :label="$t('action.cancel')"
          @click.native="hideModal"
        />
      </span>
    </template>
  </SmartModal>
</template>

<script lang="ts">
import { defineComponent } from "@nuxtjs/composition-api"
import parseCurlCommand from "~/helpers/curlparser"
import {
  HoppRESTHeader,
  HoppRESTParam,
  makeRESTRequest,
} from "~/helpers/types/HoppRESTRequest"
import { setRESTRequest } from "~/newstore/RESTSession"

export default defineComponent({
  props: {
    show: Boolean,
  },
  emits: ["hide-modal"],
  data() {
    return {
      curl: "",
    }
  },
  methods: {
    hideModal() {
      this.$emit("hide-modal")
    },
    handleImport() {
      const text = this.curl
      try {
        const parsedCurl = parseCurlCommand(text)
        const { origin, pathname } = new URL(
          parsedCurl.url.replace(/"/g, "").replace(/'/g, "")
        )
        const endpoint = origin + pathname
        const headers: HoppRESTHeader[] = []
        const params: HoppRESTParam[] = []
        if (parsedCurl.query) {
          for (const key of Object.keys(parsedCurl.query)) {
            const val = parsedCurl.query[key]!

            if (Array.isArray(val)) {
              val.forEach((value) => {
                params.push({
                  key,
                  value,
                  active: true,
                })
              })
            } else {
              params.push({
                key,
                value: val!,
                active: true,
              })
            }
          }
        }
        if (parsedCurl.headers) {
          for (const key of Object.keys(parsedCurl.headers)) {
            headers.push({
              key,
              value: parsedCurl.headers[key],
              active: true,
            })
          }
        }
        const method = parsedCurl.method.toUpperCase()
        // let rawInput = false
        // let rawParams: any | null = null

        // if (parsedCurl.data) {
        //   rawInput = true
        //   rawParams = parsedCurl.data
        // }

        this.showCurlImportModal = false

        setRESTRequest(
          makeRESTRequest({
            name: "Untitled request",
            endpoint,
            method,
            params,
            headers,
            preRequestScript: "",
            testScript: "",
            auth: {
              authType: "none",
              authActive: true,
            },
            body: {
              contentType: "application/json",
              body: "",
            },
          })
        )
      } catch (e) {
        console.error(e)
        this.$toast.error(this.$t("error.curl_invalid_format").toString(), {
          icon: "error_outline",
        })
      }
      this.hideModal()
    },
  },
})
</script>
