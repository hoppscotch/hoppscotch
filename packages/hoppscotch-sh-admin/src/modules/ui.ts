import { HoppModule } from '.';
import { plugin as HoppUI, HoppUIPluginOptions } from '@hoppscotch/ui';

const HoppUIOptions: HoppUIPluginOptions = {};

export default <HoppModule>{
  onVueAppInit(app) {
    // disable eslint for this line. it's a hack because there's some unknown type error
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    app.use(HoppUI, HoppUIOptions);
  },
};
