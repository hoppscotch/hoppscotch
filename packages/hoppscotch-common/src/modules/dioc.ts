import { HoppModule } from "."
import { Container } from "dioc"
import { diocPlugin } from "dioc/vue"

export default <HoppModule>{
  onVueAppInit(app) {
    // TODO: look into this
    // @ts-expect-error Something weird with Vue versions
    app.use(diocPlugin, {
      container: new Container(),
    })
  },
}
