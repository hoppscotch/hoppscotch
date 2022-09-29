import { HoppModule } from "."
import VueTippy, { setDefaultProps } from "vue-tippy"

import "tippy.js/dist/tippy.css"
import "tippy.js/animations/scale-subtle.css"

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(VueTippy)

    setDefaultProps({
      animation: "scale-subtle",
      appendTo: document.body,
      allowHTML: false,
      animateFill: false,
      arrow: false,
      popperOptions: {
        // https://popper.js.org/docs/v2/utils/detect-overflow/
        modifiers: [
          {
            name: "preventOverflow",
            options: {
              rootBoundary: "document",
            },
          },
        ],
      },
    })
  },
}
