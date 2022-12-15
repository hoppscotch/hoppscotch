import { HoppModule } from "."

import HoppUI from "./../../../hoppscotch-ui/src/index"

export default <HoppModule>{
  onVueAppInit(app) {
    app.use(HoppUI)
  },
}
