import { HoppModule } from "~/types"
import VueTippy, { TippyOptions } from "vue-tippy"
import 'tippy.js/dist/tippy.css' // optional for styling

const tippyModule: HoppModule = ({ app }) => {
  app.use(VueTippy, <TippyOptions>{
    allowHTML: false,
    animateFill: false,
    arrow: true, // TODO: arrowType: "round"
    popperOptions: {
      modifiers: [
        {
          name: "preventOverflow",
          options: {
            boundariesElement: "window"
          }
        }
      ]
    }
  })
}

export default tippyModule
