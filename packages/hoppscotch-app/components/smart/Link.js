/* Vue 2 Functional Component: https://vuejs.org/v2/guide/render-function.html#Functional-Components */
import { mergeData } from "vue-functional-data-merge"
import getLinkTag, { ANCHOR_TAG, FRAMEWORK_LINK } from "~/assets/js/getLinkTag"

const SmartLink = {
  functional: true,
  props: {
    to: {
      type: String,
      default: "",
    },
    exact: {
      type: Boolean,
      default: false,
    },
    blank: {
      type: Boolean,
      default: false,
    },
  },
  // It's a convention to rename `createElement` to `h`
  render(h, context) {
    const tag = getLinkTag(context.props)

    // Map our attributes correctly
    const attrs = {}
    let on = {}
    switch (tag) {
      case ANCHOR_TAG:
        attrs["aria-label"] = "Link"

        // Map `to` prop to the correct attribute
        attrs.href = context.props.to

        // Handle `blank` prop
        if (context.props.blank) {
          attrs.target = "_blank"
          attrs.rel = "noopener"
        }

        // Transform native events to regular events for HTML anchor tag
        on = { ...context.data.nativeOn }
        delete context.data.nativeOn
        break

      case FRAMEWORK_LINK:
        // Map `to` prop to the correct attribute
        attrs.to = context.props.to

        // Handle `exact` prop
        if (context.props.exact) {
          attrs.exact = true
        }

        break

      default:
        attrs["aria-label"] = "Button"
        break
    }

    // Merge our new data with existing ones
    const data = mergeData(context.data, { attrs, on })

    // Return a new virtual node
    return h(tag, data, context.children)
  },
}

export default SmartLink
