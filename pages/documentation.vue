<template>
  <Splitpanes :dbl-click-splitter="false" vertical>
    <Pane class="hide-scrollbar !overflow-auto">
      <Splitpanes :dbl-click-splitter="false" horizontal>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="import">
            <div class="flex p-4 items-start justify-between">
              <label>
                {{ $t("generate_docs_message") }}
              </label>
              <span
                class="
                  bg-accentDark
                  rounded
                  text-accentContrast
                  py-1
                  px-2
                  inline-flex
                "
              >
                BETA
              </span>
            </div>
            <div
              class="
                bg-primary
                border-b border-dividerLight
                flex
                top-0
                z-10
                items-start
                justify-between
                sticky
              "
            >
              <label for="collectionUpload">
                <ButtonSecondary
                  v-tippy="{ theme: 'tooltip' }"
                  title="JSON"
                  icon="folder"
                  class="rounded-none"
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
                :title="$t('clear')"
                icon="clear_all"
                @click.native="collectionJSON = '[]'"
              />
            </div>
            <SmartAceEditor
              v-model="collectionJSON"
              :lang="'json'"
              :lint="false"
              :options="{
                maxLines: Infinity,
                minLines: 16,
                autoScrollEditorIntoView: true,
                showPrintMargin: false,
                useWorker: false,
              }"
            />
            <div
              class="
                bg-primary
                flex
                p-4
                bottom-0
                z-10
                justify-between
                items-start
                sticky
              "
            >
              <ButtonPrimary
                :label="$t('generate_docs')"
                @click.native="getDoc"
              />
            </div>
          </AppSection>
        </Pane>
        <Pane class="hide-scrollbar !overflow-auto">
          <AppSection label="documentation">
            <div class="flex flex-col">
              <div
                v-if="items.length === 0"
                class="
                  flex flex-col
                  text-secondaryLight
                  p-4
                  items-center
                  justify-center
                "
              >
                <i class="opacity-75 pb-2 material-icons">topic</i>
                <span class="text-center">
                  {{ $t("generate_docs_first") }}
                </span>
              </div>
              <div
                v-else
                class="
                  bg-primary
                  border-b border-dividerLight
                  flex flex-1
                  p-4
                  top-0
                  z-10
                  sticky
                "
              >
                <div
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
                </div>
              </div>
              <div
                v-for="(collection, index) in items"
                :key="`collection-${index}`"
              >
                <DocsCollection :collection="collection" />
              </div>
            </div>
          </AppSection>
        </Pane>
      </Splitpanes>
    </Pane>
    <Pane
      v-if="RIGHT_SIDEBAR"
      max-size="35"
      size="25"
      min-size="20"
      class="hide-scrollbar !overflow-auto"
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
import { currentUser$ } from "~/helpers/fb/auth"
import DocsTemplate from "~/assets/md/docs.md"
import folderContents from "~/assets/md/folderContents.md"
import folderBody from "~/assets/md/folderBody.md"
import { useSetting } from "~/newstore/settings"

export default defineComponent({
  components: { Splitpanes, Pane },
  setup() {
    return {
      RIGHT_SIDEBAR: useSetting("RIGHT_SIDEBAR"),
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
  subscriptions() {
    return {
      currentUser: currentUser$,
    }
  },
  head() {
    return {
      title: `Documentation • Hoppscotch`,
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
          this.$toast.success(this.$t("export.gist_created"), {
            icon: "done",
          })
          window.open(res.html_url)
        })
        .catch((e) => {
          this.$toast.error(this.$t("error.something_went_wrong"), {
            icon: "error",
          })
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
        this.$toast.info(this.$t("file_imported"), {
          icon: "attach_file",
        })
      } else {
        this.$toast.error(this.$t("choose_file"), {
          icon: "attach_file",
        })
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
        this.$toast.info(this.$t("docs_generated"), {
          icon: "book",
        })
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
              return this.rawParams && this.rawParams !== "{}"
            },
            isPreRequestScript() {
              return (
                this.preRequestScript &&
                this.preRequestScript !== `// pw.env.set('variable', 'value');`
              )
            },
            isTestScript() {
              return (
                this.testScript &&
                this.testScript !== `// pw.expect('variable').toBe('value');`
              )
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
        this.$toast.error(this.$t("error.something_went_wrong"), {
          icon: "error",
        })
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
