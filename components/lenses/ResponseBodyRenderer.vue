<template>
  <div>
    <tabs>
      <tab
        v-for="(lens, index) in validLenses"
        :key="lens.lensName"
        :id="lens.lensName"
        :label="lens.lensName"
        :selected="index === 0"
      >
        <component :is="lens.renderer" :response="response" />
      </tab>
      <tab
        v-if="Object.keys(response.headers).length !== 0"
        id="headers"
        :label="`Headers \xA0 • \xA0 ${Object.keys(response.headers).length}`"
      >
        <headers :headers="response.headers" />
      </tab>
    </tabs>
  </div>
</template>

<script>
import getSuitableLenses from "~/helpers/lenses/lenses"

export default {
  components: {
    tabs: () => import("../ui/tabs"),
    tab: () => import("../ui/tab"),
    // Lens Renderers
    raw: () => import("./renderers/RawLensRenderer"),
    json: () => import("./renderers/JSONLensRenderer"),
    imageres: () => import("./renderers/ImageLensRenderer"),
    htmlres: () => import("./renderers/HTMLLensRenderer"),
    xmlres: () => import("./renderers/XMLLensRenderer"),
    headers: () => import("./headers"),
  },
  props: {
    response: {},
  },
  computed: {
    validLenses() {
      return getSuitableLenses(this.response)
    },
  },
}
</script>
