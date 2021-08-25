<template>
  <SmartModal v-if="show" @close="hideModal">
    <template #header>
      <h3 class="heading">{{ $t("import_openapi") }}</h3>
    </template>
    <template #body>
      <ul
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-divider
          divide-dashed divide-divider
          md:divide-y-0
          border-t
        "
      >
        <li>
          <label>{{ $t("server_url") }}</label>
          <input
            v-model="serverURL"
            class="input"
            type="text"
            placeholder="http://example.com/"
          />
        </li>
      </ul>
      <label>{{ $t("request") }}</label>
      <ul
        v-for="(request, index) in imported.requests"
        :key="`${request.name}_${index}`"
        class="
          border-b border-dashed
          divide-y
          md:divide-x
          border-divider
          divide-dashed divide-divider
          md:divide-y-0
        "
        :class="{ 'border-t': index == 0 }"
      >
        <div>
          <li>
            <button
              v-tooltip.bottom="{
                content:
                  importedRequests[index] === true
                    ? $t('turn_off')
                    : $t('turn_on'),
              }"
              class="icon button"
              @click="
                () => {
                  toggleEnabled(index)
                }
              "
            >
              <i class="material-icons">
                {{
                  importedRequests[index] === true
                    ? "check_box"
                    : "check_box_outline_blank"
                }}
              </i>
            </button>
          </li>
        </div>
        <li>
          <input class="input" :value="request.name" disabled />
        </li>
      </ul>
    </template>
    <template #footer>
      <span></span>
      <span>
        <button class="icon button" @click="hideModal">
          {{ $t("cancel") }}
        </button>
        <button class="icon button primary" @click="importCollection">
          {{ $t("save") }}
        </button>
      </span>
    </template>
  </SmartModal>
</template>

<script>
import cloneDeep from "lodash/cloneDeep"
import { appendRESTCollections } from "~/newstore/collections"

export default {
  props: {
    show: Boolean,
    imported: {
      type: Object,
      default: () => ({
        requests: [],
      }),
    },
  },
  data() {
    return {
      importedRequests: this.imported.requests.map((_) => true),
      serverURL: "",
    }
  },
  watch: {
    imported(newVal, oldVal) {
      if (newVal.requests.length !== oldVal.requests.length)
        this.importedRequests = newVal.requests.map((_) => true)
    },
  },
  methods: {
    hideModal() {
      this.serverURL = ""
      this.$emit("hide-modal")
    },
    toggleEnabled(ind) {
      this.importedRequests = this.importedRequests.map((val, index) =>
        ind === index ? !val : val
      )
    },
    importCollection() {
      const collectionAdded = cloneDeep(this.imported)
      collectionAdded.requests = collectionAdded.requests
        .filter((_, i) => this.importedRequests[i])
        .map((req) => ({
          ...req,
          url: this.serverURL,
        }))
      console.log({ collectionAdded })
      appendRESTCollections([collectionAdded])
      this.hideModal()
    },
  },
}
</script>
