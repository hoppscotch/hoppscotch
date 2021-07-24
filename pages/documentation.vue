<template>
  <div>
    <Splitpanes vertical :dbl-click-splitter="false">
      <Pane class="overflow-auto hide-scrollbar">
        <Splitpanes horizontal :dbl-click-splitter="false">
          <Pane class="overflow-auto hide-scrollbar">
            <AppSection label="import">
              <div class="flex flex-col">
                <label>{{ $t("collection") }}</label>
                <p>
                  {{ $t("generate_docs_message") }}
                </p>
                <div class="flex flex-1">
                  <label for="collectionUpload">
                    <ButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      title="JSON"
                      icon="folder"
                      :label="$t('import_collections')"
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
                  <div>
                    <ButtonSecondary
                      v-tippy="{ theme: 'tooltip' }"
                      :title="$t('clear')"
                      icon="clear_all"
                      @click.native="collectionJSON = '[]'"
                    />
                  </div>
                </div>
                <SmartAceEditor
                  v-model="collectionJSON"
                  :lang="'json'"
                  :lint="false"
                  :options="{
                    maxLines: '16',
                    minLines: '8',
                    fontSize: '14px',
                    autoScrollEditorIntoView: true,
                    showPrintMargin: false,
                    useWorker: false,
                  }"
                />
                <ButtonSecondary
                  icon="topic"
                  :label="$t('generate_docs')"
                  @click.native="getDoc"
                />
              </div>
            </AppSection>
          </Pane>
          <Pane class="overflow-auto hide-scrollbar">
            <AppSection label="documentation">
              <div class="flex flex-col">
                <label>{{ $t("documentation") }}</label>
                <p v-if="items.length === 0">
                  {{ $t("generate_docs_first") }}
                </p>
                <div v-else class="flex flex-1">
                  <div
                    v-tippy="{ theme: 'tooltip' }"
                    :title="
                      !currentUser
                        ? $t('login_with_github_to') + $t('create_secret_gist')
                        : currentUser.provider !== 'github.com'
                        ? $t('login_with_github_to') + $t('create_secret_gist')
                        : null
                    "
                  >
                    <ButtonSecondary
                      :disabled="
                        !currentUser
                          ? true
                          : currentUser.provider !== 'github.com'
                          ? true
                          : false
                      "
                      icon="assignment"
                      label="$t('create_secret_gist')"
                      @click.native="createDocsGist"
                    />
                  </div>
                </div>
                <div>
                  <span
                    v-for="(collection, index) in items"
                    :key="`collection-${index}`"
                  >
                    <DocsCollection :collection="collection" />
                  </span>
                </div>
              </div>
            </AppSection>
          </Pane>
        </Splitpanes>
      </Pane>
      <Pane
        v-if="RIGHT_SIDEBAR"
        max-size="30"
        size="25"
        min-size="20"
        class="overflow-auto hide-scrollbar"
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
  </div>
</template>

<script>
import { defineComponent } from "@nuxtjs/composition-api"
import { Splitpanes, Pane } from "splitpanes"
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
          this.$toast.success(this.$t("gist_created"), {
            icon: "done",
          })
          window.open(res.html_url)
        })
        .catch((error) => {
          this.$toast.error(this.$t("something_went_wrong"), {
            icon: "error",
          })
          console.log(error)
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
        this.$toast.error(e, {
          icon: "code",
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
