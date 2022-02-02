<template>
  <Splitpanes
    class="smart-splitter"
    :rtl="SIDEBAR_ON_LEFT && mdAndLarger"
    :class="{
      '!flex-row-reverse': SIDEBAR_ON_LEFT && mdAndLarger,
    }"
    :horizontal="!mdAndLarger"
  >
    <Pane
      size="75"
      min-size="65"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <Splitpanes class="smart-splitter" :horizontal="COLUMN_LAYOUT">
        <Pane
          :size="COLUMN_LAYOUT ? 45 : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <div class="flex items-start justify-between p-4">
            <label>
              {{ $t("documentation.generate_message") }}
            </label>
            <span
              class="inline-flex px-2 py-1 rounded bg-accentDark text-accentContrast"
            >
              BETA
            </span>
          </div>
          <div
            class="sticky top-0 z-10 flex items-start justify-between border-b bg-primary border-dividerLight"
          >
            <label for="collectionUpload">
              <ButtonSecondary
                v-tippy="{ theme: 'tooltip' }"
                title="JSON"
                svg="folder"
                class="!rounded-none"
                :label="$t('import.collections')"
                @click.native="$refs.collectionUpload.click()"
              />
            </label>
            <input
              ref="collectionUpload"
              class="input"
              name="collectionUpload"
              type="file"
              @change="uploadCollection"
            />
            <ButtonSecondary
              v-tippy="{ theme: 'tooltip' }"
              :title="$t('action.clear')"
              svg="trash-2"
              @click.native="collectionJSON = '[]'"
            />
          </div>
          <textarea-autosize
            id="import-curl"
            v-model="collectionJSON"
            class="w-full p-4 font-mono bg-primary"
            autofocus
            rows="8"
          />
          <div
            class="sticky bottom-0 z-10 flex items-start justify-between p-4 border-t border-b bg-primary border-dividerLight"
          >
            <ButtonPrimary
              :label="$t('documentation.generate')"
              @click.native="getDoc"
            />
          </div>
        </Pane>
        <Pane
          :size="COLUMN_LAYOUT ? 65 : 50"
          class="hide-scrollbar !overflow-auto flex flex-col"
        >
          <div class="flex flex-col">
            <div
              v-if="items.length === 0"
              class="flex flex-col items-center justify-center p-4 text-secondaryLight"
            >
              <i class="pb-2 opacity-75 material-icons">topic</i>
              <span class="text-center">
                {{ $t("helpers.generate_documentation_first") }}
              </span>
            </div>
            <div
              v-else
              class="sticky top-0 z-10 flex flex-1 p-4 border-b bg-primary border-dividerLight"
            >
              <span
                v-tippy="{ theme: 'tooltip' }"
                :title="
                  !currentUser
                    ? $t('export.require_github')
                    : currentUser.provider !== 'github.com'
                    ? $t('export.require_github')
                    : 'Beta'
                "
              >
                <ButtonPrimary
                  :disabled="
                    !currentUser
                      ? true
                      : currentUser.provider !== 'github.com'
                      ? true
                      : false
                  "
                  :label="$t('export.create_secret_gist')"
                  @click.native="createDocsGist"
                />
              </span>
            </div>
            <div
              v-for="(collection, index) in items"
              :key="`collection-${index}`"
            >
              <DocsCollection :collection="collection" />
            </div>
          </div>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="SIDEBAR"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto flex flex-col"
    >
      <aside>
        <Collections
          :selected="selected"
          :doc="true"
          @use-collection="useSelectedCollection($event)"
          @remove-collection="removeSelectedCollection($event)"
        />
      </aside>
    </Pane>
  </Splitpanes>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
import "splitpanes/dist/splitpanes.css"
import Mustache from "mustache"
import { breakpointsTailwind, useBreakpoints } from "@vueuse/core"
import { currentUser$ } from "~/helpers/fb/auth"
import DocsTemplate from "~/assets/md/docs.md"
import folderContents from "~/assets/md/folderContents.md"
import folderBody from "~/assets/md/folderBody.md"
import { useSetting } from "~/newstore/settings"
import { useReadonlyStream } from "~/helpers/utils/composables"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    const breakpoints = useBreakpoints(breakpointsTailwind)
    const mdAndLarger = breakpoints.greater("md")

    return {
      mdAndLarger,
      SIDEBAR: useSetting("SIDEBAR"),
      COLUMN_LAYOUT: useSetting("COLUMN_LAYOUT"),
      currentUser: useReadonlyStream(currentUser$, null),
      SIDEBAR_ON_LEFT: useSetting("SIDEBAR_ON_LEFT"),
    }
  },
  data() {
    return {
      collectionJSON: "[]",
      items: [],
      docsMarkdown: "",
      selected: [],
    }
  },
  head() {
    return {
      title: `${this.$t("navigation.doc")} • Hoppscotch`,
    }
  },
  methods: {
    async createDocsGist() {
      await this.$axios
        .$post(
          "https://api.github.com/gists",
          {
            files: {
              "api-docs.md": {
                content: this.docsMarkdown,
              },
            },
          },
          {
            headers: {
              Authorization: `token ${this.currentUser.accessToken}`,
              Accept: "application/vnd.github.v3+json",
            },
          }
        )
        .then((res) => {
          this.$toast.success(this.$t("export.gist_created"))
          window.open(res.html_url)
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"))
          console.error(e)
        })
    },

    uploadCollection() {
      const file = this.$refs.collectionUpload.files[0]
      if (file !== undefined && file !== null) {
        const reader = new FileReader()
        reader.onload = ({ target }) => {
          this.collectionJSON = target.result
        }
        reader.readAsText(file)
        this.$toast.success(this.$t("state.file_imported"))
      } else {
        this.$toast.error(this.$t("action.choose_file"))
      }
      this.$refs.collectionUpload.value = ""
    },

    assignIDs(items, pref, nestingLevel) {
      for (let i = 0; i < items.length; ++i) {
        items[i].id = `&emsp;${pref}${i + 1}.`
        items[i].ref = `${items[i].name.split(" ").join("-")}`
        items[i].nestingLevel = nestingLevel
        items[i].folders = this.assignIDs(
          items[i].folders,
          items[i].id,
          nestingLevel + "#"
        )
        for (let j = 0; j < items[i].requests.length; ++j) {
          items[i].requests[j].id = `&emsp;${items[i].id}${i + 1}`
          items[i].requests[j].ref = `${items[i].requests[j].name
            .split(" ")
            .join("-")}`
          items[i].requests[j].nestingLevel = nestingLevel + "#"
        }
      }
      return items
    },

    getDoc() {
      try {
        this.items = JSON.parse(this.collectionJSON)
        this.assignIDs(this.items, "", "#")
        this.$toast.clear()
        this.$toast.success(this.$t("state.docs_generated"))
        const docsMarkdown = Mustache.render(
          DocsTemplate,
          {
            collections: this.items,
            isHeaders() {
              return this.headers.length
            },
            isParams() {
              return this.params.length
            },
            isAuth() {
              return this.auth !== "None"
            },
            isAuthBasic() {
              return this.httpUser && this.httpPassword
            },
            isRawParams() {
              return this.rawParams && this.rawParams !== ""
            },
            isPreRequestScript() {
              return this.preRequestScript && this.preRequestScript !== ""
            },
            isTestScript() {
              return this.testScript && this.testScript !== ""
            },
          },
          {
            folderContents,
            folderBody,
          }
        )
        this.docsMarkdown = docsMarkdown.replace(/^\s*[\r\n]/gm, "\n\n")
      } catch (e) {
        console.error(e)
        this.$toast.error(this.$t("error.something_went_wrong"))
      }
    },

    useSelectedCollection(collection) {
      if (this.selected.find((coll) => coll === collection)) {
        return
      }
      this.selected.push(collection)
      const importCollection = JSON.stringify(this.selected, null, 2)
      this.collectionJSON = JSON.stringify(
        JSON.parse(importCollection),
        null,
        2
      )
    },

    removeSelectedCollection(collection) {
      this.selected = this.selected.filter((coll) => coll !== collection)
      const importCollection = JSON.stringify(this.selected, null, 2)
      this.collectionJSON = JSON.stringify(
        JSON.parse(importCollection),
        null,
        2
      )
    },
  },
})
</script>
