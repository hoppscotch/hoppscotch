import { ref, Ref } from "@nuxtjs/composition-api"

export default function usePreview(
  previewEnabledDefault: boolean,
  previewFrame: Ref<any>,
  url: Ref<any>,
  responseBodyText: Ref<any>
): any {
  const previewEnabled = ref(previewEnabledDefault)

  const togglePreview = () => {
    previewEnabled.value = !previewEnabled.value
    if (previewEnabled.value) {
      if (previewFrame.value.getAttribute("data-previewing-url") === url.value)
        return
      // Use DOMParser to parse document HTML.
      const previewDocument = new DOMParser().parseFromString(
        responseBodyText.value,
        "text/html"
      )
      // Inject <base href="..."> tag to head, to fix relative CSS/HTML paths.
      previewDocument.head.innerHTML =
        `<base href="${url.value}">` + previewDocument.head.innerHTML
      // Finally, set the iframe source to the resulting HTML.
      previewFrame.value.srcdoc = previewDocument.documentElement.outerHTML
      previewFrame.value.setAttribute("data-previewing-url", url.value)
    }
  }

  return {
    previewEnabled,
    togglePreview,
  }
}
