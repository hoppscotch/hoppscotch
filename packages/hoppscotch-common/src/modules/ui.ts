import { HoppModule } from "."

import HoppUI from "./../../../hoppscotch-ui/src/index"

export default <HoppModule>{
  onVueAppInit(app) {
    // disable eslint for this line because it's a hack
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use(HoppUI)
  },
}
